import { describe, it, expect, beforeEach } from "vitest";
import { createUser } from "@/lib/user";
import { createTeam, joinTeam, updateMemberRole } from "@/lib/team";
import { createLabel, listTeamLabels } from "@/lib/label";
import { resetDb } from "./helpers";

async function makeUser(email: string) {
  return createUser({ email, password: "password123", name: email.split("@")[0] });
}

async function scene() {
  const owner = await makeUser("owner@example.com");
  const team = await createTeam(owner.id, "东吴实验室");
  const student = await makeUser("student@example.com");
  await joinTeam(student.id, team.inviteCode);
  const teacher = await makeUser("teacher@example.com");
  await joinTeam(teacher.id, team.inviteCode);
  await updateMemberRole(owner.id, team.id, teacher.id, "teacher");
  const outsider = await makeUser("outsider@example.com");
  return { owner, team, student, teacher, outsider };
}

describe("createLabel", () => {
  beforeEach(resetDb);

  it("admin 可建标签，默认色 slate", async () => {
    const { owner, team } = await scene();
    const label = await createLabel(owner.id, team.id, { name: "论文" });
    expect(label.name).toBe("论文");
    expect(label.color).toBe("slate");
  });

  it("student 建标签被拒", async () => {
    const { student, team } = await scene();
    await expect(createLabel(student.id, team.id, { name: "实验" })).rejects.toThrow("没有权限");
  });

  it("非成员建标签被拒", async () => {
    const { outsider, team } = await scene();
    await expect(createLabel(outsider.id, team.id, { name: "实验" })).rejects.toThrow("没有权限");
  });

  it("同团队重名（大小写不同）被拒", async () => {
    const { owner, team } = await scene();
    await createLabel(owner.id, team.id, { name: "Paper" });
    await expect(createLabel(owner.id, team.id, { name: "paper" })).rejects.toThrow("标签已存在");
  });

  it("空名与超长名被拒", async () => {
    const { owner, team } = await scene();
    await expect(createLabel(owner.id, team.id, { name: "   " })).rejects.toThrow("不可为空");
    await expect(createLabel(owner.id, team.id, { name: "字".repeat(21) })).rejects.toThrow("超过");
  });

  it("名称写入前 trim", async () => {
    const { owner, team } = await scene();
    const label = await createLabel(owner.id, team.id, { name: "  数据清洗  " });
    expect(label.name).toBe("数据清洗");
  });
});

describe("listTeamLabels", () => {
  beforeEach(resetDb);

  it("团队成员（含 teacher）可读，按名称排序", async () => {
    const { owner, team, teacher } = await scene();
    await createLabel(owner.id, team.id, { name: "实验", color: "green" });
    await createLabel(owner.id, team.id, { name: "代码", color: "blue" });
    const list = await listTeamLabels(teacher.id, team.id);
    expect(list.map((l) => l.name)).toEqual(["代码", "实验"]);
  });

  it("非成员读取被拒", async () => {
    const { outsider, team } = await scene();
    await expect(listTeamLabels(outsider.id, team.id)).rejects.toThrow("没有权限");
  });
});
