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
    <form action={formAction} className="ac-card space-y-2 p-4">
      <h2 className="font-medium text-ink">新建任务</h2>
      <input type="hidden" name="projectId" value={projectId} />
      <input name="title" placeholder="任务标题" className="ac-field" />
      <div className="flex flex-wrap gap-2">
        <select name="assigneeId" defaultValue="" className="ac-field w-auto text-sm">
          <option value="">未分配</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select name="milestoneId" defaultValue="" className="ac-field w-auto text-sm">
          <option value="">无里程碑</option>
          {milestones.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>
        <select name="priority" defaultValue="medium" className="ac-field w-auto text-sm">
          <option value="low">低</option>
          <option value="medium">中</option>
          <option value="high">高</option>
        </select>
        <input type="date" name="dueDate" className="ac-field w-auto text-sm" />
      </div>
      {state?.error && <p className="text-sm text-high">{state.error}</p>}
      <button disabled={pending} className="ac-btn px-3 py-2 text-sm">
        {pending ? "创建中…" : "创建任务"}
      </button>
    </form>
  );
}
