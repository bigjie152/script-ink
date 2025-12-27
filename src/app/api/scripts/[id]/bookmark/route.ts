import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { scriptBookmarks, scripts } from "@/lib/db/schema";

export const runtime = "edge";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const db = getDb();
  const scriptRows = await db.select().from(scripts).where(eq(scripts.id, id)).limit(1);
  if (scriptRows.length === 0) {
    return NextResponse.json({ message: "未找到剧本" }, { status: 404 });
  }
  if (scriptRows[0].isPublic !== 1) {
    return NextResponse.json({ message: "该剧本未公开" }, { status: 403 });
  }

  const existing = await db
    .select()
    .from(scriptBookmarks)
    .where(and(eq(scriptBookmarks.scriptId, id), eq(scriptBookmarks.userId, user.id)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(scriptBookmarks)
      .where(and(eq(scriptBookmarks.scriptId, id), eq(scriptBookmarks.userId, user.id)));
  } else {
    await db.insert(scriptBookmarks).values({
      scriptId: id,
      userId: user.id,
      createdAt: Date.now(),
    });
  }

  const countRows = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(scriptBookmarks)
    .where(eq(scriptBookmarks.scriptId, id));

  return NextResponse.json({
    bookmarked: existing.length === 0,
    bookmarkCount: countRows[0]?.count ?? 0,
  });
}
