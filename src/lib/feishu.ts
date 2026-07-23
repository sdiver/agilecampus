// 飞书斥候：自建应用 API 封装。所有请求以 FEISHU_BASE_URL 为 base。
// 端点基于飞书开放平台标准；实现前以官方文档核验路径与字段。

const BASE = () => process.env.FEISHU_BASE_URL ?? "https://open.feishu.cn";

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`[feishu] 缺环境变量 ${key}`);
  return v;
}

// tenant_access_token 内存缓存：{ token, 过期毫秒时间戳 }。留 300s 安全余量。
let tokenCache: { token: string; expiresAt: number } | null = null;

export async function getTenantAccessToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const res = await fetch(`${BASE()}/open-apis/auth/v3/tenant_access_token/internal`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      app_id: requireEnv("FEISHU_APP_ID"),
      app_secret: requireEnv("FEISHU_APP_SECRET"),
    }),
  });
  const data = (await res.json()) as { code: number; tenant_access_token?: string; expire?: number; msg?: string };
  if (data.code !== 0 || !data.tenant_access_token) {
    throw new Error(`[feishu] 取 tenant_access_token 失败：${data.code} ${data.msg ?? ""}`);
  }
  tokenCache = {
    token: data.tenant_access_token,
    expiresAt: Date.now() + (data.expire ?? 7200) * 1000 - 300_000,
  };
  return tokenCache.token;
}
