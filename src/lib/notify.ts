import { and, eq, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { tasks, users } from "@/db/schema";
import { sendTextMessage } from "./feishu";

type TaskRow = { id: string; title: string; dueDate: string | null; assigneeId: string | null; createdById?: string | null };

// 取用户 open_id（未绑返回 null）
async function openIdOf(userId: string): Promise<string | null> {
  const [row] = await db.select({ openId: users.feishuOpenId }).from(users).where(eq(users.id, userId));
  return row?.openId ?? null;
}

// 统一发送：失败仅记日志，绝不抛（fire-and-forget，通知不得阻断主业务）
async function safeSend(openId: string, text: string): Promise<boolean> {
  try {
    await sendTextMessage(openId, text);
    return true;
  } catch (e) {
    console.error("[notify] 飞书发送失败", e);
    return false;
  }
}

export async function notifyTaskAssigned(task: TaskRow): Promise<void> {
  if (!task.assigneeId) return;
  const openId = await openIdOf(task.assigneeId);
  if (!openId) return;
  const due = task.dueDate ? `（截止 ${task.dueDate}）` : "";
  await safeSend(openId, `【新任务】你被指派：${task.title}${due}`);
}

export async function notifyTaskCompleted(task: TaskRow, actorId: string): Promise<void> {
  const creatorId = task.createdById ?? null;
  if (!creatorId || creatorId === actorId) return;
  const openId = await openIdOf(creatorId);
  if (!openId) return;
  await safeSend(openId, `【已完成】你创建的任务「${task.title}」已完成`);
}

// 扫全库临期(明日到期)+逾期(已过期未 done)，按负责人聚合为日报。返回发送人数与扫描任务数。
export async function scanAndNotifyDue(): Promise<{ notified: number; tasksScanned: number }> {
  // 临期/逾期：status≠done 且 dueDate ≤ 明日（含逾期），且负责人已绑飞书
  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      dueDate: tasks.dueDate,
      assigneeId: tasks.assigneeId,
      openId: users.feishuOpenId,
    })
    .from(tasks)
    .innerJoin(users, eq(tasks.assigneeId, users.id))
    .where(
      and(
        ne(tasks.status, "done"),
        isNotNull(tasks.dueDate),
        isNotNull(users.feishuOpenId),
        // dueDate <= 明日（date 列与 CURRENT_DATE 比较）
        sql`${tasks.dueDate} <= CURRENT_DATE + INTERVAL '1 day'`,
      ),
    );

  // 按负责人聚合
  const byUser = new Map<string, { openId: string; overdue: string[]; dueSoon: string[] }>();
  const todayStr = new Date().toISOString().slice(0, 10);
  for (const r of rows) {
    if (!r.assigneeId || !r.openId) continue;
    const bucket = byUser.get(r.assigneeId) ?? { openId: r.openId, overdue: [], dueSoon: [] };
    if (r.dueDate && r.dueDate < todayStr) bucket.overdue.push(r.title);
    else bucket.dueSoon.push(r.title);
    byUser.set(r.assigneeId, bucket);
  }

  let notified = 0;
  for (const { openId, overdue, dueSoon } of byUser.values()) {
    const lines: string[] = ["【任务提醒】"];
    if (overdue.length) lines.push(`逾期未完成：${overdue.join("、")}`);
    if (dueSoon.length) lines.push(`即将到期：${dueSoon.join("、")}`);
    const ok = await safeSend(openId, lines.join("\n"));
    if (ok) notified++;
  }
  return { notified, tasksScanned: rows.length };
}
