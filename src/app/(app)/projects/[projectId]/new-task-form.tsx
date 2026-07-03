"use client";

import { useActionState } from "react";
import { createTaskAction, type FormState } from "./actions";

export function NewTaskForm({
  projectId,
  members,
  milestones,
}: {
  projectId: string;
  members: { id: string; name: string }[];
  milestones: { id: string; title: string }[];
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createTaskAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-2 rounded border p-4">
      <h2 className="font-medium">新建任务</h2>
      <input type="hidden" name="projectId" value={projectId} />
      <input name="title" placeholder="任务标题" className="w-full rounded border p-2" />
      <div className="flex flex-wrap gap-2">
        <select name="assigneeId" defaultValue="" className="rounded border p-2 text-sm">
          <option value="">未分配</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select name="milestoneId" defaultValue="" className="rounded border p-2 text-sm">
          <option value="">无里程碑</option>
          {milestones.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
        <select name="priority" defaultValue="medium" className="rounded border p-2 text-sm">
          <option value="low">低</option>
          <option value="medium">中</option>
          <option value="high">高</option>
        </select>
        <input type="date" name="dueDate" className="rounded border p-2 text-sm" />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "创建中…" : "创建任务"}
      </button>
    </form>
  );
}
