"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerAction, type FormState } from "./actions";

export default function RegisterPage() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    registerAction,
    null,
  );

  return (
    <main className="mx-auto mt-24 w-full max-w-sm space-y-4 p-6">
      <h1 className="text-2xl font-bold">注册 AgileCampus</h1>
      <form action={formAction} className="space-y-3">
        <input name="name" placeholder="姓名" className="w-full rounded border p-2" />
        <input name="email" type="email" placeholder="邮箱" className="w-full rounded border p-2" />
        <input name="password" type="password" placeholder="密码（至少 8 位）" className="w-full rounded border p-2" />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button disabled={pending} className="w-full rounded bg-black p-2 text-white disabled:opacity-50">
          {pending ? "注册中…" : "注册"}
        </button>
      </form>
      <p className="text-sm text-gray-500">
        已有账号？<Link href="/login" className="underline">去登录</Link>
      </p>
    </main>
  );
}
