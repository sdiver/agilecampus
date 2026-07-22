"use client";

import { useState } from "react";
import { DraftCards, type Draft } from "./draft-cards";

type Option = { id: string; name: string };
type Msg = { role: "user" | "assistant"; content: string; drafts?: Draft[] };

export function ChatPanel({
  projectId,
  initialMessages,
  members,
  milestones,
}: {
  projectId: string;
  initialMessages: Msg[];
  members: Option[];
  milestones: Option[];
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const text = input.trim();
    if (!text || pending) return;
    setInput("");
    setError(null);
    setMessages((m) => [...m, { role: "user", content: text }]);
    setPending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, userText: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "对话失败");
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: data.text, drafts: data.drafts }]);
    } catch {
      setError("网络异常，请重试");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-3 rounded border p-4">
      <h2 className="font-medium">项目助手</h2>
      <div className="max-h-96 space-y-2 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i}>
            <div className={`rounded p-2 text-sm ${m.role === "user" ? "bg-gray-100" : "bg-blue-50"}`}>
              <span className="mr-2 text-xs text-gray-400">{m.role === "user" ? "我" : "助手"}</span>
              <span className="whitespace-pre-wrap">{m.content}</span>
            </div>
            {m.drafts && m.drafts.length > 0 && (
              <DraftCards projectId={projectId} drafts={m.drafts} members={members} milestones={milestones} />
            )}
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-sm text-gray-500">向助手提问，如「当前进度如何？」或「把调研拆成任务」</p>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="问点什么…"
          className="flex-1 rounded border p-2 text-sm"
          disabled={pending}
        />
        <button onClick={send} disabled={pending} className="rounded bg-black px-3 py-2 text-sm text-white disabled:opacity-50">
          {pending ? "思考中…" : "发送"}
        </button>
      </div>
    </section>
  );
}
