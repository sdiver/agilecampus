"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";

// 飞书 JSSDK 全局（运行时由飞书客户端注入 window.h5sdk / window.tt）
declare global {
  interface Window {
    h5sdk?: {
      config: (c: {
        appId: string;
        timestamp: number;
        nonceStr: string;
        signature: string;
        onSuccess?: () => void;
        onFail?: (e: unknown) => void;
      }) => void;
      ready: (cb: () => void) => void;
      error: (cb: (e: unknown) => void) => void;
    };
    tt?: {
      requestAuthCode: (o: {
        appId: string;
        success: (res: { code: string }) => void;
        fail: (e: unknown) => void;
      }) => void;
    };
  }
}

export function FeishuLogin() {
  const [status, setStatus] = useState<"idle" | "silent" | "failed">("idle");

  useEffect(() => {
    if (typeof window === "undefined" || !window.h5sdk) return;
    setStatus("silent");

    const pageUrl = window.location.href.split("#")[0];
    (async () => {
      try {
        const res = await fetch(`/api/feishu/jssdk-config?url=${encodeURIComponent(pageUrl)}`);
        if (!res.ok) throw new Error("config fetch failed");
        const cfg = (await res.json()) as {
          appId: string; timestamp: number; nonceStr: string; signature: string;
        };
        window.h5sdk!.config({ ...cfg, onFail: () => setStatus("failed") });
        window.h5sdk!.error(() => setStatus("failed"));
        window.h5sdk!.ready(() => {
          window.tt!.requestAuthCode({
            appId: cfg.appId,
            success: async ({ code }) => {
              await signIn("feishu", { code, redirectTo: "/teams" });
            },
            fail: () => setStatus("failed"),
          });
        });
      } catch {
        setStatus("failed");
      }
    })();
  }, []);

  if (status === "silent") {
    return <p className="text-center text-sm text-ink-soft">正在通过飞书登录…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-ink-faint">
        <span className="h-px flex-1 bg-line" />
        或
        <span className="h-px flex-1 bg-line" />
      </div>
      {status === "failed" && (
        <p className="text-center text-xs text-high">飞书免登失败，请点下方按钮</p>
      )}
      <a href="/api/auth/feishu/login" className="ac-btn ac-btn-ghost block w-full text-center">
        飞书登录
      </a>
    </div>
  );
}
