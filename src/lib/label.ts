import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { labels, type LabelColor } from "@/db/schema";
import { AppError, ForbiddenError, isUniqueViolation } from "./errors";
import { getTeamMembership, requireTeamRole } from "./team";

const LABEL_NAME_MAX = 20;

function normalizeName(raw: string) {
  const name = raw.trim();
  if (!name) throw new AppError("标签名不可为空");
  if (name.length > LABEL_NAME_MAX)
    throw new AppError(`标签名不可超过 ${LABEL_NAME_MAX} 字`);
  return name;
}

// 大小写不敏感查重。excludeId 供改名时排除自身。
async function assertNameFree(teamId: string, name: string, excludeId?: string) {
  const rows = await db
    .select({ id: labels.id })
    .from(labels)
    .where(and(eq(labels.teamId, teamId), sql`lower(${labels.name}) = lower(${name})`));
  if (rows.some((r) => r.id !== excludeId)) throw new AppError("标签已存在");
}

export async function listTeamLabels(actorId: string, teamId: string) {
  const member = await getTeamMembership(actorId, teamId);
  if (!member) throw new ForbiddenError();
  return db
    .select({ id: labels.id, name: labels.name, color: labels.color })
    .from(labels)
    .where(eq(labels.teamId, teamId))
    .orderBy(labels.name);
}

export async function createLabel(
  actorId: string,
  teamId: string,
  input: { name: string; color?: LabelColor },
) {
  await requireTeamRole(actorId, teamId, ["admin"]);
  const name = normalizeName(input.name);
  await assertNameFree(teamId, name);

  try {
    const [label] = await db
      .insert(labels)
      .values({ teamId, name, color: input.color ?? "slate" })
      .returning();
    return label;
  } catch (e) {
    // 查重与插入之间的并发窗口，由唯一约束兜底（同 joinTeam 之形制）
    if (isUniqueViolation(e)) throw new AppError("标签已存在");
    throw e;
  }
}
