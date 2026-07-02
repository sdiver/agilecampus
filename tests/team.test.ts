import { describe, it, expect, beforeEach } from "vitest";
import { createUser } from "@/lib/user";
import { createTeam, joinTeam } from "@/lib/team";
import { AppError } from "@/lib/errors";
import { resetDb } from "./helpers";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { and, eq } from "drizzle-orm";

async function makeUser(email: string) {
  return createUser({ email, password: "password123", name: email.split("@")[0] });
}

describe("createTeam", () => {
  beforeEach(resetDb);

  it("创建团队，创建者成为 admin，且生成邀请码", async () => {
    const u = await makeUser("owner@example.com");
    const team = await createTeam(u.id, "东吴实验室");
    expect(team.name).toBe("东吴实验室");
    expect(team.inviteCode).toHaveLength(10);

    const [m] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, u.id)));
    expect(m.role).toBe("admin");
  });
});

describe("joinTeam", () => {
  beforeEach(resetDb);

  it("凭邀请码加入，默认角色 student", async () => {
    const owner = await makeUser("owner@example.com");
    const team = await createTeam(owner.id, "东吴实验室");
    const joiner = await makeUser("joiner@example.com");

    const joined = await joinTeam(joiner.id, team.inviteCode);
    expect(joined.teamId).toBe(team.id);

    const [m] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.userId, joiner.id)));
    expect(m.role).toBe("student");
  });

  it("邀请码无效时抛出可展示错误", async () => {
    const u = await makeUser("a@example.com");
    await expect(joinTeam(u.id, "no-such-code")).rejects.toThrow("邀请码无效");
  });

  it("重复加入抛出可展示错误", async () => {
    const owner = await makeUser("owner@example.com");
    const team = await createTeam(owner.id, "东吴实验室");
    await expect(joinTeam(owner.id, team.inviteCode)).rejects.toThrow("已在该团队中");
  });

  it("绕过查重的唯一键冲突（23505）被转译为可展示的 AppError", async () => {
    const owner = await makeUser("owner@example.com");
    const team = await createTeam(owner.id, "东吴实验室");
    const joiner = await makeUser("joiner@example.com");

    let releaseTx!: () => void;
    const hold = new Promise<void>((r) => (releaseTx = r));
    let markInserted!: () => void;
    const inserted = new Promise<void>((r) => (markInserted = r));

    // 事务先插入同一 (team_id, user_id) 但不提交：joinTeam 的查重（读已提交）看不到该行，
    // 其 insert 将阻塞在唯一索引锁上；事务提交后必现 23505，
    // 从而确定性地覆盖「查重通过但唯一约束拦截」的竞态路径。
    const tx = db.transaction(async (trx) => {
      await trx.insert(teamMembers).values({ teamId: team.id, userId: joiner.id, role: "student" });
      markInserted();
      await hold;
    });

    await inserted;
    const pending = joinTeam(joiner.id, team.inviteCode);
    pending.catch(() => {}); // 预挂 handler，消除拒绝早于断言挂接的瞬时 unhandled rejection
    await new Promise((r) => setTimeout(r, 300)); // 让 joinTeam 完成查重并阻塞于 insert
    releaseTx();
    await tx;

    await expect(pending).rejects.toBeInstanceOf(AppError);
    await expect(pending).rejects.toThrow("已在该团队中");
  });
});
