import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createPasswordHash, createSession } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/utils";

export const runtime = "edge";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const username = String(body?.username ?? "").trim();
  const displayName = String(body?.displayName ?? "").trim() || username;
  const password = String(body?.password ?? "");

  if (username.length < 3 || password.length < 4) {
    return NextResponse.json({ message: "用户名或密码太短" }, { status: 400 });
  }

  const db = getDb();
  const existing = await db.select().from(users).where(eq(users.username, username)).limit(1);
  if (existing.length > 0) {
    return NextResponse.json({ message: "用户名已存在" }, { status: 409 });
  }

  const { salt, hash } = await createPasswordHash(password);
  const now = Date.now();
  const userId = crypto.randomUUID();

  await db.insert(users).values({
    id: userId,
    username,
    passwordHash: hash,
    passwordSalt: salt,
    displayName,
    createdAt: now,
  });

  const session = await createSession(userId);
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
