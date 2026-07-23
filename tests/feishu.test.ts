import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// 每个用例前重置模块缓存（getTenantAccessToken 的内存缓存跨用例会污染）
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("FEISHU_APP_ID", "cli_test");
  vi.stubEnv("FEISHU_APP_SECRET", "secret_test");
  vi.stubEnv("FEISHU_BASE_URL", "https://open.feishu.cn");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("getTenantAccessToken", () => {
  it("换取 token 并缓存（第二次不再打网络）", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ code: 0, tenant_access_token: "t-abc", expire: 7200 }), {
        status: 200,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { getTenantAccessToken } = await import("@/lib/feishu");
    expect(await getTenantAccessToken()).toBe("t-abc");
    expect(await getTenantAccessToken()).toBe("t-abc");
    expect(fetchMock).toHaveBeenCalledTimes(1); // 缓存命中
  });

  it("飞书返回非零 code → 抛错", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ code: 99991663, msg: "app not found" }), { status: 200 }),
      ),
    );
    const { getTenantAccessToken } = await import("@/lib/feishu");
    await expect(getTenantAccessToken()).rejects.toThrow();
  });
});
