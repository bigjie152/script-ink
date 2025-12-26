import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSession, verifyPassword } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/utils";

export const runtime = "edge";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const username = String(body?.username ?? "").trim();
  const password = String(body?.password ?? "");

  if (!username || !password) {
    return NextResponse.json({ message: "请输入用户名和密码" }, { status: 400 });
  }

  const db = getDb();
  const userRows = await db.select().from(users).where(eq(users.username, username)).limit(1);
  const user = userRows[0];
  if (!user) {
    return NextResponse.json({ message: "用户名或密码错误" }, { status: 400 });
  }

  const ok = await verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!ok) {
    return NextResponse.json({ message: "用户名或密码错误" }, { status: 400 });
  }

  const now = Date.now();
  const session = await createSession(user.id);
  const response = NextResponse.json({ ok: true });
  const secure = request.url.startsWith("https://");
  response.cookies.set(SESSION_COOKIE, session.sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: Math.floor((session.expiresAt - now) / 1000),
  });

  return response;
}
