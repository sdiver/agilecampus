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
    create_project: tool({
      description: "拟一个新项目草案（在当前项目所属团队下）。仅产草案，需人工确认后落库。",
      inputSchema: z.object({
        name: z.string(),
        description: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
      execute: async (input) => draftEnvelope("create_project", input),
    }),
    decompose_tasks: tool({
      description: "把目标/需求拆成任务清单草案。仅产草案，需人工确认后落库。",
      inputSchema: z.object({
        tasks: z.array(
          z.object({
            title: z.string(),
            description: z.string().optional(),
            assigneeId: z.string().optional(),
            dueDate: z.string().optional(),
            milestoneId: z.string().optional(),
            priority: z.enum(["low", "medium", "high"]).optional(),
          }),
        ),
      }),
      execute: async (input) => draftEnvelope("decompose_tasks", input),
    }),
    update_tasks: tool({
      description: "拟批量任务变更草案（状态/负责人/截止日/里程碑/优先级/标题）。仅产草案，需人工确认。",
      inputSchema: z.object({
        updates: z.array(
          z.object({
            taskId: z.string(),
            patch: z.object({
              title: z.string().optional(),
              status: z.enum(["todo", "doing", "done"]).optional(),
              assigneeId: z.string().optional(),
              dueDate: z.string().optional(),
              milestoneId: z.string().optional(),
              priority: z.enum(["low", "medium", "high"]).optional(),
            }),
          }),
        ),
      }),
      // 为每个 update 填入当前 updatedAt（乐观锁读时版本），供 commit 比对
      execute: async (input) => {
        const rows = await listProjectTasks(actorId, projectId);
        const versionOf = new Map(rows.map((r) => [r.id, r.updatedAt]));
        const updates = input.updates.map((u) => ({
          taskId: u.taskId,
          updatedAt: versionOf.get(u.taskId)?.toISOString() ?? "",
          patch: u.patch,
        }));
        return draftEnvelope("update_tasks", { updates });
      },
    }),
    plan_sprint: tool({
      description: "把选定任务排入某里程碑并批量设截止日。仅产草案，需人工确认。",
      inputSchema: z.object({
        milestoneId: z.string(),
        taskIds: z.array(z.string()),
        dueDate: z.string(),
      }),
      execute: async (input) => draftEnvelope("plan_sprint", input),
    }),
  };
}

export const WRITE_TOOL_NAMES = [
  "create_project",
  "decompose_tasks",
  "update_tasks",
  "plan_sprint",
] as const;

export type WriteToolName = (typeof WRITE_TOOL_NAMES)[number];

// 草案信封：写工具 execute 的统一返回形态，供 orchestrator 识别提取
export type DraftEnvelope = { __draft: true; tool: WriteToolName; draft: unknown };

function draftEnvelope(tool: WriteToolName, draft: unknown): DraftEnvelope {
  return { __draft: true, tool, draft };
}
