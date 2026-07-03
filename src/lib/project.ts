import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { milestones, projects } from "@/db/schema";
import { ForbiddenError } from "./errors";
import { getTeamMembership, requireTeamRole } from "./team";

export async function createProject(
  actorId: string,
  teamId: string,
  input: {
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  },
) {
  await requireTeamRole(actorId, teamId, ["admin"]);
  const [project] = await db
    .insert(projects)
    .values({
      teamId,
      name: input.name,
      description: input.description,
      startDate: input.startDate,
      endDate: input.endDate,
    })
    .returning();
  return project;
}

export async function listTeamProjects(actorId: string, teamId: string) {
  await requireTeamRole(actorId, teamId, ["admin", "teacher", "student"]);
  return db
    .select()
    .from(projects)
    .where(eq(projects.teamId, teamId))
    .orderBy(desc(projects.createdAt));
}

// 页面/任务层的访问收敛点：项目不存在或非团队成员一律 null，不泄露存在性
export async function getProjectForUser(actorId: string, projectId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId));
  if (!project) return null;
  const membership = await getTeamMembership(actorId, project.teamId);
  if (!membership) return null;
  return { project, role: membership.role };
}

export async function createMilestone(
  actorId: string,
  projectId: string,
  input: { title: string; targetDate?: string },
) {
  const access = await getProjectForUser(actorId, projectId);
  if (!access || access.role !== "admin") throw new ForbiddenError();
  const [milestone] = await db
    .insert(milestones)
    .values({ projectId, title: input.title, targetDate: input.targetDate })
    .returning();
  return milestone;
}

export async function listProjectMilestones(actorId: string, projectId: string) {
  const access = await getProjectForUser(actorId, projectId);
  if (!access) throw new ForbiddenError();
  return db
    .select()
    .from(milestones)
    .where(eq(milestones.projectId, projectId))
    .orderBy(milestones.targetDate);
}
