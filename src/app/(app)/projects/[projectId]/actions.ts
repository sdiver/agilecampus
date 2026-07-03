"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { createTask, updateTask, deleteTask } from "@/lib/task";
import { createMilestone } from "@/lib/project";
import { AppError, ForbiddenError } from "@/lib/errors";

export type FormState = { error: string } | null;

const createTaskSchema = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(1, "请填写任务标题"),
  assigneeId: z.uuid().optional(),
  dueDate: z.iso.date("日期格式不正确").optional(),
  milestoneId: z.uuid().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});

export async function createTaskAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "请先登录" };

  const raw = Object.fromEntries(formData);
  const parsed = createTaskSchema.safeParse({
    ...raw,
    assigneeId: raw.assigneeId || undefined,
    dueDate: raw.dueDate || undefined,
    milestoneId: raw.milestoneId || undefined,
    priority: raw.priority || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { projectId, ...input } = parsed.data;
  try {
    await createTask(session.user.id, projectId, input);
  } catch (e) {
    if (e instanceof ForbiddenError) return { error: "没有权限创建任务" };
    if (e instanceof AppError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/projects/${projectId}`);
  return null;
}

const createMilestoneSchema = z.object({
  projectId: z.uuid(),
  title: z.string().trim().min(1, "请填写里程碑标题"),
  targetDate: z.iso.date("日期格式不正确").optional(),
});

export async function createMilestoneAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "请先登录" };

  const raw = Object.fromEntries(formData);
  const parsed = createMilestoneSchema.safeParse({
    ...raw,
    targetDate: raw.targetDate || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await createMilestone(session.user.id, parsed.data.projectId, {
      title: parsed.data.title,
      targetDate: parsed.data.targetDate,
    });
  } catch (e) {
    if (e instanceof ForbiddenError) return { error: "仅团队管理员可创建里程碑" };
    if (e instanceof AppError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/projects/${parsed.data.projectId}`);
  return null;
}

const moveTaskSchema = z.object({
  taskId: z.uuid(),
  projectId: z.uuid(),
  status: z.enum(["todo", "doing", "done"]),
});

export async function moveTaskAction(input: {
  taskId: string;
  projectId: string;
  status: "todo" | "doing" | "done";
}): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "请先登录" };

  const parsed = moveTaskSchema.safeParse(input);
  if (!parsed.success) return { error: "参数无效" };

  try {
    await updateTask(session.user.id, parsed.data.taskId, {
      status: parsed.data.status,
    });
  } catch (e) {
    if (e instanceof AppError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/projects/${parsed.data.projectId}`);
  return null;
}

const updateTaskSchema = z.object({
  taskId: z.uuid(),
  projectId: z.uuid(),
  title: z.string().trim().min(1, "标题不可为空"),
  assigneeId: z.uuid().optional(),
  milestoneId: z.uuid().optional(),
  dueDate: z.iso.date("日期格式不正确").optional(),
  priority: z.enum(["low", "medium", "high"]),
});

export async function updateTaskAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "请先登录" };

  const raw = Object.fromEntries(formData);
  const parsed = updateTaskSchema.safeParse({
    ...raw,
    assigneeId: raw.assigneeId || undefined,
    milestoneId: raw.milestoneId || undefined,
    dueDate: raw.dueDate || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { taskId, projectId, ...patch } = parsed.data;
  try {
    await updateTask(session.user.id, taskId, {
      title: patch.title,
      assigneeId: patch.assigneeId ?? null,
      milestoneId: patch.milestoneId ?? null,
      dueDate: patch.dueDate ?? null,
      priority: patch.priority,
    });
  } catch (e) {
    if (e instanceof ForbiddenError) return { error: "没有权限修改任务" };
    if (e instanceof AppError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/projects/${projectId}`);
  return null;
}

const deleteTaskSchema = z.object({
  taskId: z.uuid(),
  projectId: z.uuid(),
});

export async function deleteTaskAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await auth();
  if (!session?.user) return { error: "请先登录" };

  const parsed = deleteTaskSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "参数无效" };

  try {
    await deleteTask(session.user.id, parsed.data.taskId);
  } catch (e) {
    if (e instanceof ForbiddenError) return { error: "没有权限删除任务" };
    if (e instanceof AppError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/projects/${parsed.data.projectId}`);
  return null;
}
