import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { exchangeOAuthCode } from "@/lib/feishu";
import { bindFeishu } from "@/lib/user";
import { AppError } from "@/lib/errors";

const SITE = process.env.AGILECAMPUS_URL ?? "http://localhost:3000";

// 回调：校 state → 取当前用户 → code 换 open_id → 绑定 → 回设置页带提示。
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const store = await cookies();
  const expected = store.get("feishu_oauth_state")?.value;
  store.delete("feishu_oauth_state");

  const settings = new URL("/settings", SITE);

  if (!code || !state || !expected || state !== expected) {
    settings.searchParams.set("feishu", "state_error");
    return NextResponse.redirect(settings);
  }

  const session = await auth();
  if (!session?.user) return NextResponse.redirect(new URL("/login", SITE));

  try {
    const { openId, name } = await exchangeOAuthCode(code);
    await bindFeishu(session.user.id, { openId, name });
    settings.searchParams.set("feishu", "bound");
  } catch (e) {
    settings.searchParams.set("feishu", e instanceof AppError ? "conflict" : "error");
    if (!(e instanceof AppError)) console.error("[feishu callback]", e);
  }
  return NextResponse.redirect(settings);
}
