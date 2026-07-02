"use client";

import { Suspense, useActionState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { loginAction, type FormState } from "./actions";

function LoginForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    loginAction,
    null,
  );
  const registered = useSearchParams().get("registered");

  return (
    <main className="mx-auto mt-24 w-full max-w-sm space-y-4 p-6">
      <h1 className="text-2xl font-bold">登录 AgileCampus</h1>
      {registered && <p className="text-sm text-green-600">注册成功，请登录。</p>}
      <form action={formAction} className="space-y-3">
        <input name="email" type="email" placeholder="邮箱" className="w-full rounded border p-2" />
        <input name="password" type="password" placeholder="密码" className="w-full rounded border p-2" />
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button disabled={pending} className="w-full rounded bg-black p-2 text-white disabled:opacity-50">
          {pending ? "登录中…" : "登录"}
        </button>
      </form>
      <p className="text-sm text-gray-500">
        没有账号？<Link href="/register" className="underline">去注册</Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
