import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function resetDb() {
  await db.execute(
    sql`TRUNCATE tasks, milestones, projects, team_members, teams, users RESTART IDENTITY CASCADE`,
  );
}
