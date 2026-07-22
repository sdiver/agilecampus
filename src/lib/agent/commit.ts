import { z } from "zod";
import { createProject, getProjectForUser } from "@/lib/project";
import { createTask, listProjectTasks, updateTask } from "@/lib/task";
import { ForbiddenError } from "@/lib/errors";
import type { WriteToolName } from "./tools";

const taskDraftSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  milestoneId: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

const decomposeSchema = z.object({ tasks: z.array(taskDraftSchema).min(1) });

const patchSchema = z.object({
  title: z.string().optional(),
  status: z.enum(["todo", "doing", "done"]).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  milestoneId: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

const updateTasksSchema = z.object({
  updates: z
    .array(z.object({ taskId: z.string(), updatedAt: z.string(), patch: patchSchema }))
    .min(1),
});

const planSprintSchema = z.object({
  milestoneId: z.string(),
  taskIds: z.array(z.string()).min(1),
  dueDate: z.string(),
});

export type CommitResult = { committed: number; conflicts: string[] };

// 落库：绝不信 Agent 输出——入口重校访问权，每类先施 Zod，再走图二 lib（lib 内建权限/归属校验）
export async function commitDraft(
  actorId: string,
  projectId: string,
  tool: WriteToolName,
  draft: unknown,
): Promise<CommitResult> {
  const access = await getProjectForUser(actorId, projectId);
  if (!access) throw new ForbiddenError();

  switch (tool) {
    case "create_project": {
      const d = createProjectSchema.parse(draft);
      await createProject(actorId, access.project.teamId, d);
      return { committed: 1, conflicts: [] };
    }
    case "decompose_tasks": {
      const d = decomposeSchema.parse(draft);
      for (const t of d.tasks) await createTask(actorId, projectId, t);
      return { committed: d.tasks.length, conflicts: [] };
    }
    case "update_tasks": {
      const d = updateTasksSchema.parse(draft);
      const current = await listProjectTasks(actorId, projectId);
      const versionOf = new Map(current.map((r) => [r.id, r.updatedAt.toISOString()]));
      const conflicts: string[] = [];
      let committed = 0;
      for (const u of d.updates) {
        if (versionOf.get(u.taskId) !== u.updatedAt) {
          conflicts.push(u.taskId);
          continue;
        }
        await updateTask(actorId, u.taskId, u.patch);
        committed++;
      }
      return { committed, conflicts };
    }
    case "plan_sprint": {
      const d = planSprintSchema.parse(draft);
      for (const id of d.taskIds)
        await updateTask(actorId, id, { milestoneId: d.milestoneId, dueDate: d.dueDate });
      return { committed: d.taskIds.length, conflicts: [] };
    }
  }
}
