"use client";

import { useActionState, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import {
  deleteTaskAction,
  updateTaskAction,
  type FormState,
  type UpdateTaskState,
} from "./actions";
import type { BoardTask } from "./board";

export type Option = { id: string; name: string };
type TaskOption = { id: string; title: string };

const PRIORITY_BADGE: Record<string, string> = {
  high: "bg-high-soft text-high",
  medium: "bg-medium-soft text-medium",
  low: "bg-low-soft text-low",
};

export function TaskCard({
  task,
  projectId,
  canWrite,
  members,
  milestones,
  allTasks,
  dependencies,
}: {
  task: BoardTask;
  projectId: string;
  canWrite: boolean;
  members: Option[];
  milestones: Option[];
  allTasks: TaskOption[];
  dependencies: { predecessorId: string; successorId: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const searchParams = useSearchParams();
  useEffect(() => {
    // 深链 /projects/[id]?task=<taskId>：命中本卡片则打开详情弹窗（仅 canWrite 有 EditModal）
    if (canWrite && searchParams.get("task") === task.id) setEditing(true);
  }, [searchParams, task.id, canWrite]);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !canWrite || editing,
  });
  const successorTitles = dependencies
    .filter((d) => d.predecessorId === task.id)
    .map((d) => allTasks.find((t) => t.id === d.successorId)?.title)
    .filter(Boolean);

  return (
    <div
      ref={setNodeRef}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
          : undefined
      }
      className={`ac-card p-3 text-sm transition hover:shadow-md ${isDragging ? "opacity-50" : ""}`}
    >
      <div
        {...listeners}
        {...attributes}
        className={canWrite && !editing ? "cursor-grab" : ""}
      >
        <p className="font-medium text-ink">{task.title}</p>
        <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-soft">
          <span>{task.assigneeName ?? "未分配"}</span>
          {(task.startDate || task.dueDate) && (
            <span>· {task.startDate ?? "…"}→{task.dueDate ?? "…"}</span>
          )}
          <span className={`ac-badge ${PRIORITY_BADGE[task.priority] ?? "bg-low-soft text-low"}`}>
            {task.priority}
          </span>
        </p>
        {task.description && (
          <p className="mt-1 text-xs text-ink-soft line-clamp-2">{task.description}</p>
        )}
        {task.status === "done" && task.completionNote && (
          <p className="mt-1 rounded bg-done/10 px-2 py-1 text-xs text-done">
            完成情况：{task.completionNote}
          </p>
        )}
        {successorTitles.length > 0 && (
          <p className="mt-1 text-xs text-ink-faint">后置：{successorTitles.join("、")}</p>
        )}
      </div>

      {canWrite && (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-2 text-xs text-ink-faint hover:text-primary hover:underline"
        >
          编辑
        </button>
      )}

      {editing && (
        <EditModal
          task={task}
          projectId={projectId}
          members={members}
          milestones={milestones}
          allTasks={allTasks}
          dependencies={dependencies}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}

function EditModal({
  task,
  projectId,
  members,
  milestones,
  allTasks,
  dependencies,
  onClose,
}: {
  task: BoardTask;
  projectId: string;
  members: Option[];
  milestones: Option[];
  allTasks: TaskOption[];
  dependencies: { predecessorId: string; successorId: string }[];
  onClose: () => void;
}) {
  const [updateState, updateFormAction, updating] = useActionState<UpdateTaskState, FormData>(
    updateTaskAction,
    null,
  );
  const [deleteState, deleteFormAction, deleting] = useActionState<FormState, FormData>(
    deleteTaskAction,
    null,
  );

  // 保存成功（action 回 { ok: true }）即关窗
  useEffect(() => {
    if (updateState && "ok" in updateState) onClose();
  }, [updateState, onClose]);

  // Esc 关闭
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const updateError = updateState && "error" in updateState ? updateState.error : null;
  const deleteError = deleteState && "error" in deleteState ? deleteState.error : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="编辑任务"
    >
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="fixed inset-0 cursor-default bg-ink/45 backdrop-blur-sm"
      />
      <div className="relative z-10 my-auto w-full max-w-md ac-card p-5 shadow-pop">
        <header className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-base font-semibold text-ink">编辑任务</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="grid h-7 w-7 place-items-center rounded-field text-ink-faint hover:bg-sunken hover:text-ink"
          >
            ✕
          </button>
        </header>

        <form action={updateFormAction} className="space-y-2.5">
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="projectId" value={projectId} />

          <Field label="标题">
            <input name="title" defaultValue={task.title} className="ac-field text-sm" />
          </Field>
          <Field label="描述">
            <textarea
              name="description"
              defaultValue={task.description ?? ""}
              rows={2}
              className="ac-field text-sm"
              placeholder="任务描述"
            />
          </Field>
          <Field label="完成情况（完成时填写）">
            <textarea
              name="completionNote"
              defaultValue={task.completionNote ?? ""}
              rows={2}
              className="ac-field text-sm"
              placeholder="完成说明"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2.5">
            <Field label="负责人">
              <select name="assigneeId" defaultValue={task.assigneeId ?? ""} className="ac-field text-sm">
                <option value="">未分配</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="里程碑">
              <select name="milestoneId" defaultValue={task.milestoneId ?? ""} className="ac-field text-sm">
                <option value="">无里程碑</option>
                {milestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="优先级">
              <select name="priority" defaultValue={task.priority} className="ac-field text-sm">
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
            </Field>
            <Field label="起始日">
              <input type="date" name="startDate" defaultValue={task.startDate ?? ""} className="ac-field text-sm" />
            </Field>
            <Field label="截止日">
              <input type="date" name="dueDate" defaultValue={task.dueDate ?? ""} className="ac-field text-sm" />
            </Field>
          </div>

          <Field label="后置任务（可多选）">
            <select
              multiple
              name="successorIds"
              defaultValue={dependencies
                .filter((d) => d.predecessorId === task.id)
                .map((d) => d.successorId)}
              className="ac-field text-sm"
              size={Math.min(4, Math.max(2, allTasks.length - 1))}
            >
              {allTasks
                .filter((t) => t.id !== task.id)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
            </select>
          </Field>

          {updateError && <p className="text-sm text-high">{updateError}</p>}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="ac-btn-ghost">
              取消
            </button>
            <button disabled={updating} className="ac-btn">
              {updating ? "保存中…" : "保存"}
            </button>
          </div>
        </form>

        <form
          action={deleteFormAction}
          onSubmit={(e) => {
            if (!confirm("确认删除该任务？此操作不可恢复。")) e.preventDefault();
          }}
          className="mt-3 border-t border-line pt-3"
        >
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="projectId" value={projectId} />
          {deleteError && <p className="mb-1 text-xs text-high">{deleteError}</p>}
          <button
            disabled={deleting}
            className="text-xs text-high underline disabled:opacity-50"
          >
            删除任务
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      {children}
    </label>
  );
}
