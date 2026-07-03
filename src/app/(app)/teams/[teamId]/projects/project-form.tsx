"use client";

import { useActionState } from "react";
import { createProjectAction, type FormState } from "./actions";

export function ProjectForm({ teamId }: { teamId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createProjectAction,
    null,
  );

  return (
    <form action={formAction} className="space-y-2 rounded border p-4">
      <h2 className="font-medium">创建项目</h2>
      <input type="hidden" name="teamId" value={teamId} />
      <input name="name" placeholder="项目名称" className="w-full rounded border p-2" />
      <textarea
        name="description"
        placeholder="项目描述（可选）"
        className="w-full rounded border p-2"
        rows={2}
      />
      <div className="flex gap-2">
        <label className="flex-1 text-sm text-gray-500">
          开始日期
          <input type="date" name="startDate" className="w-full rounded border p-2" />
        </label>
        <label className="flex-1 text-sm text-gray-500">
          结束日期
          <input type="date" name="endDate" className="w-full rounded border p-2" />
        </label>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        disabled={pending}
        className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50"
      >
        {pending ? "创建中…" : "创建"}
      </button>
    </form>
  );
}
