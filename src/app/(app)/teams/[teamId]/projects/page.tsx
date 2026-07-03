import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getTeamMembership } from "@/lib/team";
import { listTeamProjects } from "@/lib/project";
import { ProjectForm } from "./project-form";

export default async function ProjectsPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!z.uuid().safeParse(teamId).success) notFound();

  const me = await getTeamMembership(session.user.id, teamId);
  if (!me) notFound();

  const projects = await listTeamProjects(session.user.id, teamId);
  const isAdmin = me.role === "admin";

  return (
    <main className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-2xl font-bold">项目</h1>
      <ul className="space-y-2">
        {projects.map((p) => (
          <li key={p.id} className="rounded border p-3">
            <Link href={`/projects/${p.id}`} className="font-medium underline">
              {p.name}
            </Link>
            <span className="ml-2 text-xs text-gray-500">{p.status}</span>
            {(p.startDate || p.endDate) && (
              <span className="ml-2 text-xs text-gray-400">
                {p.startDate ?? "?"} ~ {p.endDate ?? "?"}
              </span>
            )}
            {p.description && (
              <p className="mt-1 text-sm text-gray-600">{p.description}</p>
            )}
          </li>
        ))}
        {projects.length === 0 && (
          <li className="text-sm text-gray-500">
            暂无项目{isAdmin ? "，在下方创建第一个。" : "。"}
          </li>
        )}
      </ul>
      {isAdmin && <ProjectForm teamId={teamId} />}
    </main>
  );
}
