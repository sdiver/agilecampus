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
      className={`rounded border bg-white p-2 text-sm ${isDragging ? "opacity-50" : ""}`}
    >
      <div
        {...listeners}
        {...attributes}
        className={canWrite && !editing ? "cursor-grab" : ""}
      >
        <p className="font-medium">{task.title}</p>
        <p className="mt-1 text-xs text-gray-500">
          {task.assigneeName ?? "未分配"}
          {task.dueDate && ` · ${task.dueDate}`}
          {` · ${task.priority}`}
        </p>
      </div>

      {canWrite && (
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="mt-1 text-xs text-gray-400 underline"
        >
          {editing ? "收起" : "编辑"}
        </button>
      )}

      {editing && (
        <div className="mt-2 space-y-2 border-t pt-2">
          <form action={updateFormAction} className="space-y-1">
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="projectId" value={projectId} />
            <input
              name="title"
              defaultValue={task.title}
              className="w-full rounded border p-1 text-xs"
            />
            <select
              name="assigneeId"
              defaultValue={task.assigneeId ?? ""}
              className="w-full rounded border p-1 text-xs"
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
              className="w-full rounded border p-1 text-xs"
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
                className="rounded border p-1 text-xs"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
              </select>
              <input
                type="date"
                name="dueDate"
                defaultValue={task.dueDate ?? ""}
                className="rounded border p-1 text-xs"
              />
            </div>
            {updateState?.error && (
              <p className="text-xs text-red-600">{updateState.error}</p>
            )}
            <button
              disabled={updating}
              className="rounded bg-black px-2 py-1 text-xs text-white disabled:opacity-50"
            >
              保存
            </button>
          </form>
          <form action={deleteFormAction}>
            <input type="hidden" name="taskId" value={task.id} />
            <input type="hidden" name="projectId" value={projectId} />
            {deleteState?.error && (
              <p className="text-xs text-red-600">{deleteState.error}</p>
            )}
            <button
              disabled={deleting}
              className="text-xs text-red-600 underline disabled:opacity-50"
            >
              删除任务
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
