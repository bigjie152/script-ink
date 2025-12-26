import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { clearSession } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/utils";

export const runtime = "edge";

export async function POST() {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  await clearSession(sessionId);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    expires: new Date(0),
  });

  return response;
}
