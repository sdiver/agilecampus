import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { db } from "@/db";
import { teamMembers, teams } from "@/db/schema";
import { AppError, isUniqueViolation } from "./errors";

export async function createTeam(userId: string, name: string) {
  return db.transaction(async (tx) => {
    const [team] = await tx
      .insert(teams)
      .values({ name, inviteCode: nanoid(10) })
      .returning();
    await tx.insert(teamMembers).values({
      teamId: team.id,
      userId,
      role: "admin",
    });
    return team;
  });
}

export async function joinTeam(userId: string, inviteCode: string) {
  const [team] = await db.select().from(teams).where(eq(teams.inviteCode, inviteCode));
  if (!team) throw new AppError("邀请码无效");

  const [existing] = await db
    .select({ id: teamMembers.id })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, userId)));
  if (existing) throw new AppError("已在该团队中");

  try {
    const [member] = await db
      .insert(teamMembers)
      .values({ teamId: team.id, userId, role: "student" })
      .returning();
    return member;
  } catch (e) {
    // 查重与插入之间的并发窗口：另一请求已抢先加入，由 DB 唯一约束兜底
    if (isUniqueViolation(e)) throw new AppError("已在该团队中");
    throw e;
  }
}
