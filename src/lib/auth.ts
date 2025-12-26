import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { SESSION_COOKIE } from "@/lib/utils";

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14;

const toHex = (buffer: ArrayBuffer) =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const toBuffer = (value: string) => new TextEncoder().encode(value);

export const createPasswordHash = async (password: string) => {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    toBuffer(`${salt}.${password}`)
  );

  return { salt, hash: toHex(hashBuffer) };
};

export const verifyPassword = async (
  password: string,
  salt: string,
  hash: string
) => {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    toBuffer(`${salt}.${password}`)
  );
  return toHex(hashBuffer) === hash;
};

export const createSession = async (userId: string) => {
  const db = getDb();
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  const sessionId = crypto.randomUUID();

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    expiresAt,
    createdAt: now,
  });

  return { sessionId, expiresAt };
};

export const clearSession = async (sessionId?: string) => {
  if (!sessionId) return;
  const db = getDb();
  await db.delete(sessions).where(eq(sessions.id, sessionId));
};

export const getCurrentUser = async () => {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const db = getDb();
  const sessionRows = await db
    .select()
    .from(sessions)
    .where(eq(sessions.id, sessionId))
    .limit(1);

  const session = sessionRows[0];
  if (!session) return null;

  if (session.expiresAt < Date.now()) {
    await clearSession(session.id);
    return null;
  }

  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);

  return userRows[0] ?? null;
};

export const getSessionIdFromCookies = async () => {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE)?.value;
};
