import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { scriptLikes, scripts } from "@/lib/db/schema";

export const runtime = "edge";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const getLikeCount = async (scriptId: string) => {
  const db = getDb();
  const rows = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(scriptLikes)
    .where(eq(scriptLikes.scriptId, scriptId));
  return rows[0]?.count ?? 0;
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
    .select({ scriptId: scriptLikes.scriptId })
    .from(scriptLikes)
    .where(and(eq(scriptLikes.scriptId, id), eq(scriptLikes.userId, user.id)))
    .limit(1);

  let liked = false;
  if (existing.length === 0) {
    await db.insert(scriptLikes).values({
      scriptId: id,
      userId: user.id,
      createdAt: Date.now(),
    });
    liked = true;
  } else {
    await db
      .delete(scriptLikes)
      .where(and(eq(scriptLikes.scriptId, id), eq(scriptLikes.userId, user.id)));
  }

  const likeCount = await getLikeCount(id);
  return NextResponse.json({ liked, likeCount });
}
