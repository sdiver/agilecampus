"use client";

import { useActionState } from "react";
import { createTeamAction, joinTeamAction, type FormState } from "./actions";

export function TeamForms() {
  const [createState, createFormAction, creating] = useActionState<FormState, FormData>(
    createTeamAction,
    null,
  );
  const [joinState, joinFormAction, joining] = useActionState<FormState, FormData>(
    joinTeamAction,
    null,
  );

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <form action={createFormAction} className="space-y-2 rounded border p-4">
        <h2 className="font-medium">创建团队</h2>
        <input name="name" placeholder="团队名称" className="w-full rounded border p-2" />
        {createState?.error && <p className="text-sm text-red-600">{createState.error}</p>}
        <button disabled={creating} className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50">
          创建
        </button>
      </form>
      <form action={joinFormAction} className="space-y-2 rounded border p-4">
        <h2 className="font-medium">加入团队</h2>
        <input name="inviteCode" placeholder="邀请码" className="w-full rounded border p-2" />
        {joinState?.error && <p className="text-sm text-red-600">{joinState.error}</p>}
        <button disabled={joining} className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50">
          加入
        </button>
      </form>
    </div>
  );
}
