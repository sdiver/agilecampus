import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  milestones,
  taskDependencies,
  tasks,
  users,
  type TaskPriority,
  type TaskStatus,
} from "@/db/schema";
import { AppError, ForbiddenError } from "./errors";
import { getTeamMembership } from "./team";
import { getProjectForUser } from "./project";

// 任务写操作角色：admin + student（teacher 只读，设计文档 §5）
const TASK_WRITE_ROLES = ["admin", "student"];

async function requireProjectAccess(actorId: string, projectId: string) {
  const access = await getProjectForUser(actorId, projectId);
  if (!access) throw new ForbiddenError();
  return access;
}

async function requireTaskWrite(actorId: string, projectId: string) {
  const access = await requireProjectAccess(actorId, projectId);
  if (!TASK_WRITE_ROLES.includes(access.role)) throw new ForbiddenError();
  return access;
}

async function validateAssignee(teamId: string, assigneeId: string) {
  const membership = await getTeamMembership(assigneeId, teamId);
  if (!membership) throw new AppError("负责人不是团队成员");
}

async function validateMilestone(projectId: string, milestoneId: string) {
  const [m] = await db
    .select({ id: milestones.id })
    .from(milestones)
    .where(and(eq(milestones.id, milestoneId), eq(milestones.projectId, projectId)));
  if (!m) throw new AppError("里程碑不属于该项目");
}

export async function createTask(
  actorId: string,
  projectId: string,
  input: {
    title: string;
    description?: string;
    assigneeId?: string;
    startDate?: string;
    dueDate?: string;
    milestoneId?: string;
    priority?: TaskPriority;
  },
) {
  const access = await requireTaskWrite(actorId, projectId);
  if (input.assigneeId) await validateAssignee(access.project.teamId, input.assigneeId);
  if (input.milestoneId) await validateMilestone(projectId, input.milestoneId);

  const [task] = await db
    .insert(tasks)
    .values({
      projectId,
      title: input.title,
      description: input.description,
      assigneeId: input.assigneeId,
      startDate: input.startDate,
      dueDate: input.dueDate,
      milestoneId: input.milestoneId,
      priority: input.priority ?? "medium",
      sortOrder: Date.now(),
    })
    .returning();
  return task;
}

export async function updateTask(
  actorId: string,
  taskId: string,
  patch: {
    title?: string;
    description?: string | null;
    assigneeId?: string | null;
    startDate?: string | null;
    dueDate?: string | null;
    milestoneId?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority;
    completionNote?: string | null;
  },
) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) throw new AppError("任务不存在");

  const access = await requireTaskWrite(actorId, task.projectId);
  if (patch.assigneeId) await validateAssignee(access.project.teamId, patch.assigneeId);
  if (patch.milestoneId) await validateMilestone(task.projectId, patch.milestoneId);

  // 显式白名单构造，勿用 ...patch 展开：运行时宽对象可夹带 projectId/sortOrder 等越权字段
  const [updated] = await db
    .update(tasks)
    // updatedAt 取 DB 时钟（now()）而非宿主机 new Date()：与 createdAt 的 defaultNow() 同源，保证单调性
    .set({
      ...(patch.title !== undefined && { title: patch.title }),
      ...(patch.description !== undefined && { description: patch.description }),
      ...(patch.assigneeId !== undefined && { assigneeId: patch.assigneeId }),
      ...(patch.startDate !== undefined && { startDate: patch.startDate }),
      ...(patch.dueDate !== undefined && { dueDate: patch.dueDate }),
      ...(patch.milestoneId !== undefined && { milestoneId: patch.milestoneId }),
      ...(patch.status !== undefined && { status: patch.status }),
      ...(patch.priority !== undefined && { priority: patch.priority }),
      ...(patch.completionNote !== undefined && { completionNote: patch.completionNote }),
      updatedAt: sql`now()`,
    })
    .where(eq(tasks.id, taskId))
    .returning();
  if (!updated) throw new AppError("任务不存在");
  return updated;
}

export async function deleteTask(actorId: string, taskId: string) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task) throw new AppError("任务不存在");
  await requireTaskWrite(actorId, task.projectId);
  await db.delete(tasks).where(eq(tasks.id, taskId));
}

export async function listProjectTasks(actorId: string, projectId: string) {
  await requireProjectAccess(actorId, projectId);
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      startDate: tasks.startDate,
      dueDate: tasks.dueDate,
      sortOrder: tasks.sortOrder,
      milestoneId: tasks.milestoneId,
      assigneeId: tasks.assigneeId,
      assigneeName: users.name,
      updatedAt: tasks.updatedAt,
      completionNote: tasks.completionNote,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(eq(tasks.projectId, projectId))
    .orderBy(tasks.sortOrder);
}

// 设置 predecessor 的后置任务（先删旧再插新）。简单关联：仅防直接成环，不强制阻断执行。
export async function setTaskSuccessors(
  actorId: string,
  predecessorId: string,
  successorIds: string[],
) {
  const [pred] = await db.select().from(tasks).where(eq(tasks.id, predecessorId));
  if (!pred) throw new AppError("任务不存在");
  await requireTaskWrite(actorId, pred.projectId);

  for (const sid of successorIds) {
    if (sid === predecessorId) throw new AppError("后置任务不可构成循环");
    const [s] = await db
      .select({ projectId: tasks.projectId })
      .from(tasks)
      .where(eq(tasks.id, sid));
    if (!s || s.projectId !== pred.projectId)
      throw new AppError("后置任务不属于该项目");
    const [back] = await db
      .select({ id: taskDependencies.id })
      .from(taskDependencies)
      .where(
        and(
          eq(taskDependencies.predecessorId, sid),
          eq(taskDependencies.successorId, predecessorId),
        ),
      );
    if (back) throw new AppError("后置任务不可构成循环");
  }

  await db.transaction(async (tx) => {
    await tx.delete(taskDependencies).where(eq(taskDependencies.predecessorId, predecessorId));
    if (successorIds.length > 0) {
      await tx
        .insert(taskDependencies)
        .values(successorIds.map((sid) => ({ predecessorId, successorId: sid })));
    }
  });
}

export async function listProjectDependencies(actorId: string, projectId: string) {
  await requireProjectAccess(actorId, projectId);
  return db
    .select({
      predecessorId: taskDependencies.predecessorId,
      successorId: taskDependencies.successorId,
    })
    .from(taskDependencies)
    .innerJoin(tasks, eq(taskDependencies.predecessorId, tasks.id))
    .where(eq(tasks.projectId, projectId));
}
