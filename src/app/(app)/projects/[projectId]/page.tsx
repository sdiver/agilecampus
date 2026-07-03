import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getProjectForUser, listProjectMilestones } from "@/lib/project";
import { listTeamMembers } from "@/lib/team";
import { listProjectTasks } from "@/lib/task";
import { MilestoneSection } from "./milestone-section";
import { NewTaskForm } from "./new-task-form";

const COLUMNS = [
  { key: "todo", label: "待办" },
  { key: "doing", label: "进行中" },
  { key: "done", label: "已完成" },
] as const;

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!z.uuid().safeParse(projectId).success) notFound();

  const access = await getProjectForUser(session.user.id, projectId);
  if (!access) notFound();
  const { project, role } = access;

  const [projectMilestones, projectTasks, members] = await Promise.all([
    listProjectMilestones(session.user.id, projectId),
    listProjectTasks(session.user.id, projectId),
    listTeamMembers(project.teamId),
  ]);

  const canWrite = role === "admin" || role === "student";
  const isAdmin = role === "admin";

  return (
    <main className="mx-auto max-w-5xl space-y-8">
      <header>
        <h1 className="text-2xl font-bold">{project.name}</h1>
        {project.description && (
          <p className="mt-1 text-sm text-gray-600">{project.description}</p>
        )}
        <p className="mt-1 text-xs text-gray-400">
          {project.startDate ?? "?"} ~ {project.endDate ?? "?"} · {project.status}
        </p>
      </header>

      <MilestoneSection
        projectId={projectId}
        milestones={projectMilestones}
        isAdmin={isAdmin}
      />

      <section className="space-y-3">
        <h2 className="font-medium">看板</h2>
        <div className="grid grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <div key={col.key} className="space-y-2 rounded border bg-gray-50 p-3">
              <h3 className="text-sm font-medium text-gray-600">{col.label}</h3>
              {projectTasks
                .filter((t) => t.status === col.key)
                .map((t) => (
                  <div key={t.id} className="rounded border bg-white p-2 text-sm">
                    <p className="font-medium">{t.title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {t.assigneeName ?? "未分配"}
                      {t.dueDate && ` · ${t.dueDate}`}
                      {` · ${t.priority}`}
                    </p>
                  </div>
                ))}
            </div>
          ))}
        </div>
      </section>

      {canWrite && (
        <NewTaskForm
          projectId={projectId}
          members={members}
          milestones={projectMilestones.map((m) => ({ id: m.id, title: m.title }))}
        />
      )}
    </main>
  );
}
