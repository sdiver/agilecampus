import { describe, it, expect, beforeEach } from "vitest";
import { createUser } from "@/lib/user";
import { verifyPassword } from "@/lib/password";
import { resetDb } from "./helpers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("createUser", () => {
  beforeEach(resetDb);

  it("创建用户并存哈希而非明文", async () => {
    const user = await createUser({
      email: "zhou@example.com",
      password: "password123",
      name: "周瑜",
    });
    expect(user.email).toBe("zhou@example.com");
    const [row] = await db.select().from(users).where(eq(users.id, user.id));
    expect(row.passwordHash).not.toBe("password123");
    expect(await verifyPassword("password123", row.passwordHash)).toBe(true);
  });

  it("重复邮箱抛出可展示错误", async () => {
    await createUser({ email: "dup@example.com", password: "password123", name: "甲" });
    await expect(
      createUser({ email: "dup@example.com", password: "password123", name: "乙" }),
    ).rejects.toThrow("该邮箱已被注册");
  });

  it("邮箱统一转小写存储，大小写不同视为同一邮箱", async () => {
    const user = await createUser({
      email: "Zhou@Example.COM",
      password: "password123",
      name: "周瑜",
    });
    expect(user.email).toBe("zhou@example.com");
    await expect(
      createUser({ email: "ZHOU@example.com", password: "password123", name: "乙" }),
    ).rejects.toThrow("该邮箱已被注册");
  });
});
