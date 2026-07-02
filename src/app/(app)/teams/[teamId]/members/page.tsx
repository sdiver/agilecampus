import { z } from "zod";
import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { teamMembers, teams, users } from "@/db/schema";
import { getTeamMembership } from "@/lib/team";
import { updateRoleAction } from "./actions";

export default async function MembersPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");

  // teamId 来自 URL，非法 uuid 会导致后续查询报 DB 错误——提前拦截，语义上等同于「不存在」
  if (!z.uuid().safeParse(teamId).success) notFound();

  // 访问者必须是团队成员（非成员 404，不泄露团队存在性）
  const me = await getTeamMembership(session.user.id, teamId);
  if (!me) notFound();

  const [team] = await db.select().from(teams).where(eq(teams.id, teamId));
  const members = await db
    .select({ userId: users.id, name: users.name, email: users.email, role: teamMembers.role })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId));

  const isAdmin = me.role === "admin";

  return (
    <main className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">{team.name} · 成员</h1>
      <ul className="space-y-2">
        {members.map((m) => (
          <li key={m.userId} className="flex items-center justify-between rounded border p-3">
            <span>
              {m.name} <span className="text-xs text-gray-500">{m.email}</span>
            </span>
            {isAdmin && m.userId !== session.user.id ? (
              <form action={updateRoleAction} className="flex items-center gap-2">
                <input type="hidden" name="teamId" value={teamId} />
                <input type="hidden" name="userId" value={m.userId} />
                {/* key=role：角色变更后强制重挂载，使 defaultValue 重新采纳（非受控 select 不更新已挂载节点） */}
                <select key={m.role} name="role" defaultValue={m.role} className="rounded border p-1 text-sm">
                  <option value="admin">admin</option>
                  <option value="teacher">teacher</option>
                  <option value="student">student</option>
                </select>
                <button className="rounded bg-black px-2 py-1 text-xs text-white">保存</button>
              </form>
            ) : (
              <span className="text-sm text-gray-500">{m.role}</span>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
