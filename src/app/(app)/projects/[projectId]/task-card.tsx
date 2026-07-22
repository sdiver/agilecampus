"use client";

import { useActionState, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  deleteTaskAction,
  updateTaskAction,
  type FormState,
} from "./actions";
import type { BoardTask } from "./board";

export type Option = { id: string; name: string };

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
}: {
  task: BoardTask;
  projectId: string;
  canWrite: boolean;
  members: Option[];
  milestones: Option[];
}) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateFormAction, updating] = useActionState<FormState, FormData>(
    updateTaskAction,
    null,
  );
  const [deleteState, deleteFormAction, deleting] = useActionState<FormState, FormData>(
    deleteTaskAction,
    null,
  );
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    disabled: !canWrite || editing,
  });

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
          {task.dueDate && <span>· {task.dueDate}</span>}
          <span className={`ac-badge ${PRIORITY_BADGE[task.priority] ?? "bg-low-soft text-low"}`}>
            {task.priority}
          </span>
        </p>
      </div>

      {canWrite && (
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="mt-2 text-xs text-ink-faint hover:text-primary hover:underline"
        >
          {editing ? "收起" : "编辑"}
        </button>
      )}

      {editing && (
        <div className="mt-2 space-y-2 border-t border-line pt-2">
          <form action={updateFormAction} className="space-y-1">
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <input
              name="title"
              defaultValue={task.title}
              className="ac-field text-xs"
            />
            <select
              name="assigneeId"
              defaultValue={task.assigneeId ?? ""}
              className="ac-field text-xs"
            >
              <option value="">未分配</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <select
              name="milestoneId"
              defaultValue={task.milestoneId ?? ""}
              className="ac-field text-xs"
            >
              <option value="">无里程碑</option>
              {milestones.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              <select
                name="priority"
                defaultValue={task.priority}
                className="ac-field w-auto text-xs"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
              <input
                type="date"
                name="dueDate"
                defaultValue={task.dueDate ?? ""}
                className="ac-field w-auto text-xs"
              />
            </div>
            {updateState?.error && (
              <p className="text-xs text-high">{updateState.error}</p>
            )}
            <button disabled={updating} className="ac-btn px-2 py-1 text-xs">
              保存
            </button>
          </form>
          <form
            action={deleteFormAction}
            onSubmit={(e) => {
              if (!confirm("确认删除该任务？此操作不可恢复。")) e.preventDefault();
            }}
          >
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="projectId" value={projectId} />
            {deleteState?.error && (
              <p className="text-xs text-high">{deleteState.error}</p>
            )}
            <button
              disabled={deleting}
              className="text-xs text-high underline disabled:opacity-50"
            >
              删除任务
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
