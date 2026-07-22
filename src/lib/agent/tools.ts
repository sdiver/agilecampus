import { tool } from "ai";
import { z } from "zod";
import { listProjectMilestones } from "@/lib/project";
import { listProjectTasks } from "@/lib/task";
import type { TaskStatus } from "@/db/schema";

// 读工具纯函数：权限经底层 lib（listProjectMilestones/listProjectTasks 内部各调 getProjectForUser）
export async function queryProgress(actorId: string, projectId: string) {
  const [ms, ts] = await Promise.all([
    listProjectMilestones(actorId, projectId),
    listProjectTasks(actorId, projectId),
  ]);
  const byStatus: Record<TaskStatus, number> = { todo: 0, doing: 0, done: 0 };
  for (const t of ts) byStatus[t.status]++;
  return {
    taskTotal: ts.length,
    byStatus,
    milestoneTotal: ms.length,
    milestones: ms.map((m) => ({
      title: m.title,
      status: m.status,
      targetDate: m.targetDate,
    })),
  };
}

export async function listTasksFiltered(
  actorId: string,
  projectId: string,
  filters: { status?: TaskStatus; assigneeId?: string; dueBefore?: string },
) {
  let list = await listProjectTasks(actorId, projectId);
  if (filters.status) list = list.filter((t) => t.status === filters.status);
  if (filters.assigneeId) list = list.filter((t) => t.assigneeId === filters.assigneeId);
  if (filters.dueBefore)
    list = list.filter((t) => t.dueDate !== null && t.dueDate <= filters.dueBefore!);
  return list.map((t) => ({
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    dueDate: t.dueDate,
    assigneeName: t.assigneeName,
  }));
}

// AI SDK 工具装配：绑定 actorId/projectId，execute 委托纯函数
export function buildTools(actorId: string, projectId: string) {
  return {
    query_progress: tool({
      description: "查询该项目进度统计：各状态任务数、里程碑概况。无需参数。",
      inputSchema: z.object({}),
      execute: async () => queryProgress(actorId, projectId),
    }),
    list_tasks: tool({
      description: "按状态、负责人、截止日筛选该项目任务。",
      inputSchema: z.object({
        status: z.enum(["todo", "doing", "done"]).optional(),
        assigneeId: z.string().optional().describe("负责人用户 id"),
        dueBefore: z.string().optional().describe("截止日不晚于此日期（YYYY-MM-DD）"),
      }),
      execute: async (filters) => listTasksFiltered(actorId, projectId, filters),
    }),
  };
}
