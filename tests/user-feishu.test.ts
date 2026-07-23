import { describe, it, expect, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createUser, bindFeishu, unbindFeishu } from "@/lib/user";
import { AppError } from "@/lib/errors";
import { resetDb } from "./helpers";

describe("飞书绑定", () => {
  beforeEach(resetDb);

  it("绑定写入 openId/name/boundAt", async () => {
    const u = await createUser({ email: "a@e.com", password: "password123", name: "甲" });
    await bindFeishu(u.id, { openId: "ou_1", name: "甲的飞书" });

    const [row] = await db.select().from(users).where(eq(users.id, u.id));
    expect(row.feishuOpenId).toBe("ou_1");
    expect(row.feishuName).toBe("甲的飞书");
    expect(row.feishuBoundAt).not.toBeNull();
  });

  it("同一飞书号绑两个账号 → AppError", async () => {
    const a = await createUser({ email: "a@e.com", password: "password123", name: "甲" });
    const b = await createUser({ email: "b@e.com", password: "password123", name: "乙" });
    await bindFeishu(a.id, { openId: "ou_dup", name: "x" });
    await expect(bindFeishu(b.id, { openId: "ou_dup", name: "y" })).rejects.toBeInstanceOf(AppError);
  });

  it("解绑清空三字段", async () => {
    const u = await createUser({ email: "a@e.com", password: "password123", name: "甲" });
    await bindFeishu(u.id, { openId: "ou_1", name: "甲" });
    await unbindFeishu(u.id);

    const [row] = await db.select().from(users).where(eq(users.id, u.id));
    expect(row.feishuOpenId).toBeNull();
    expect(row.feishuName).toBeNull();
    expect(row.feishuBoundAt).toBeNull();
  });
});
