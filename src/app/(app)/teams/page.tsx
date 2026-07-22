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
    <main className="mx-auto max-w-2xl space-y-8 py-8">
      <h1 className="font-display text-2xl font-semibold text-ink">我的团队</h1>
      <ul className="space-y-2">
        {myTeams.map((t) => (
          <li key={t.id} className="ac-card flex items-center justify-between p-4">
            <div>
              <span className="font-medium text-ink">{t.name}</span>
              <span className="ml-2 text-xs text-ink-soft">角色：{t.role}</span>
              <span className="ml-2 text-xs text-ink-faint">邀请码：{t.inviteCode}</span>
            </div>
            <div className="flex gap-3">
              <Link href={`/teams/${t.id}/projects`} className="text-sm text-primary hover:underline">
                项目
              </Link>
              <Link href={`/teams/${t.id}/members`} className="text-sm text-primary hover:underline">
                成员管理
              </Link>
            </div>
          </li>
        ))}
        {myTeams.length === 0 && (
          <li className="text-sm text-ink-soft">尚未加入任何团队，创建一个或凭邀请码加入。</li>
        )}
      </ul>
      <TeamForms />
    </main>
  );
}
