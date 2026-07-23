import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { hashPassword } from "./password";
import { AppError, isUniqueViolation } from "./errors";

export async function createUser(input: {
  email: string;
  password: string;
  name: string;
}) {
  const email = input.email.toLowerCase();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email));
  if (existing) throw new AppError("该邮箱已被注册");

  const passwordHash = await hashPassword(input.password);
  try {
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash, name: input.name })
      .returning({ id: users.id, email: users.email, name: users.name });
    return user;
  } catch (e) {
    // 查重与插入之间的并发窗口：另一请求已抢先注册，由 DB 唯一约束兜底
    if (isUniqueViolation(e)) throw new AppError("该邮箱已被注册");
    throw e;
  }
}

// 绑定当前用户的飞书身份。open_id 唯一——已被他人绑定则转译友好错误。
export async function bindFeishu(userId: string, input: { openId: string; name: string }) {
  try {
    await db
      .update(users)
      .set({ feishuOpenId: input.openId, feishuName: input.name, feishuBoundAt: sql`now()` })
      .where(eq(users.id, userId));
  } catch (e) {
    if (isUniqueViolation(e)) throw new AppError("该飞书账号已绑定其他用户");
    throw e;
  }
}

export async function unbindFeishu(userId: string) {
  await db
    .update(users)
    .set({ feishuOpenId: null, feishuName: null, feishuBoundAt: null })
    .where(eq(users.id, userId));
}
