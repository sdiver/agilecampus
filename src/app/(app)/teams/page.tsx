import Link from "next/link";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { teamMembers, teams } from "@/db/schema";
import { TeamForms } from "./team-forms";

export default async function TeamsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const myTeams = await db
    .select({
      id: teams.id,
      name: teams.name,
      inviteCode: teams.inviteCode,
      role: teamMembers.role,
    })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, session.user.id));

  return (
    <main className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">我的团队</h1>
      <ul className="space-y-2">
        {myTeams.map((t) => (
          <li key={t.id} className="flex items-center justify-between rounded border p-3">
            <div>
              <span className="font-medium">{t.name}</span>
              <span className="ml-2 text-xs text-gray-500">角色：{t.role}</span>
              <span className="ml-2 text-xs text-gray-400">邀请码：{t.inviteCode}</span>
            </div>
            <div className="flex gap-3">
              <Link href={`/teams/${t.id}/projects`} className="text-sm underline">
                项目
              </Link>
              <Link href={`/teams/${t.id}/members`} className="text-sm underline">
                成员管理
              </Link>
            </div>
          </li>
        ))}
        {myTeams.length === 0 && (
          <li className="text-sm text-gray-500">尚未加入任何团队，创建一个或凭邀请码加入。</li>
        )}
      </ul>
      <TeamForms />
    </main>
  );
}
