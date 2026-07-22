import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listMyProjects } from "@/lib/project";

export default async function AllProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const projects = await listMyProjects(session.user.id);

  return (
    <main className="mx-auto max-w-3xl space-y-8 py-8">
      <h1 className="font-display text-2xl font-semibold text-ink">所有项目</h1>
      <ul className="space-y-2">
        {projects.map((p) => (
          <li key={p.id} className="ac-card flex items-center justify-between p-4">
            <div>
              <Link href={`/projects/${p.id}`} className="font-medium text-primary hover:underline">
                {p.name}
              </Link>
              <span className="ml-2 text-xs text-ink-faint">{p.teamName}</span>
              <span className="ml-2 text-xs text-ink-soft">{p.status}</span>
            </div>
            <div className="text-xs text-ink-soft">
              任务 {p.doneCount}/{p.taskTotal} 完成
            </div>
          </li>
        ))}
        {projects.length === 0 && (
          <li className="text-sm text-ink-soft">暂无项目——先在团队中创建。</li>
        )}
      </ul>
    </main>
  );
}
