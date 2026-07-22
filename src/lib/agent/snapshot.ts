import { getProjectForUser, listProjectMilestones } from "@/lib/project";
import { listProjectTasks } from "@/lib/task";
import { listTeamMembers } from "@/lib/team";
import { ForbiddenError } from "@/lib/errors";
import type { TaskStatus } from "@/db/schema";

const SNAPSHOT_CHAR_LIMIT = 2000;

export async function buildProjectSnapshot(actorId: string, projectId: string): Promise<string> {
  const access = await getProjectForUser(actorId, projectId);
  if (!access) throw new ForbiddenError();
  const { project } = access;

  const [milestones, tasks, members] = await Promise.all([
    listProjectMilestones(actorId, projectId),
    listProjectTasks(actorId, projectId),
    listTeamMembers(project.teamId),
  ]);

  const byStatus: Record<TaskStatus, number> = { todo: 0, doing: 0, done: 0 };
  for (const t of tasks) byStatus[t.status]++;

  const head = [
    `# 当前项目：${project.name}`,
    project.description ? `描述：${project.description}` : null,
    `状态：${project.status}；起止：${project.startDate ?? "?"} ~ ${project.endDate ?? "?"}`,
    `成员：${members.map((m) => `${m.name}(${m.role})`).join("、")}`,
    `任务统计：共 ${tasks.length} 个（待办 ${byStatus.todo} / 进行中 ${byStatus.doing} / 已完成 ${byStatus.done}）`,
    `共 ${milestones.length} 个里程碑`,
  ]
    .filter(Boolean)
    .join("\n");

  const milestoneDetail =
    milestones.length > 0
      ? "\n里程碑明细：\n" +
        milestones.map((m) => `- ${m.title}（${m.status}${m.targetDate ? ` @ ${m.targetDate}` : ""}）`).join("\n")
      : "";

  const full = head + milestoneDetail;
  // 超限降级：只留统计头（含"共 N 个里程碑"），明细由读工具现查
  return full.length > SNAPSHOT_CHAR_LIMIT ? head : full;
}
