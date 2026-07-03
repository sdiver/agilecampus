"use client";

import { useActionState } from "react";
import { createMilestoneAction, type FormState } from "./actions";

type Milestone = {
  id: string;
  title: string;
  targetDate: string | null;
  status: string;
};

export function MilestoneSection({
  projectId,
  milestones,
  isAdmin,
}: {
  projectId: string;
  milestones: Milestone[];
  isAdmin: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createMilestoneAction,
    null,
  );

  return (
    <section className="space-y-2">
      <h2 className="font-medium">里程碑</h2>
      <ul className="flex flex-wrap gap-2">
        {milestones.map((m) => (
          <li key={m.id} className="rounded border px-3 py-1 text-sm">
            {m.title}
            {m.targetDate && (
              <span className="ml-1 text-xs text-gray-400">{m.targetDate}</span>
            )}
            <span className="ml-1 text-xs text-gray-500">[{m.status}]</span>
          </li>
        ))}
        {milestones.length === 0 && (
          <li className="text-sm text-gray-500">暂无里程碑。</li>
        )}
      </ul>
      {isAdmin && (
        <form action={formAction} className="flex items-end gap-2">
          <input type="hidden" name="projectId" value={projectId} />
          <input
            name="title"
            placeholder="里程碑标题"
            className="rounded border p-2 text-sm"
          />
          <input type="date" name="targetDate" className="rounded border p-2 text-sm" />
          <button
            disabled={pending}
            className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            添加
          </button>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        </form>
      )}
    </section>
  );
}
