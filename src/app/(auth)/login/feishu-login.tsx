"use client";

// 飞书登录入口。OAuth 路：跳 /api/auth/feishu/login 发起授权。
// （JSSDK 免登在 Task 4 补入此组件。）
export function FeishuLogin() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-xs text-ink-faint">
        <span className="h-px flex-1 bg-line" />
        或
        <span className="h-px flex-1 bg-line" />
      </div>
      <a href="/api/auth/feishu/login" className="ac-btn ac-btn-ghost block w-full text-center">
        飞书登录
      </a>
    </div>
  );
}
