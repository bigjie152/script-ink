import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { commentLikes, comments } from "@/lib/db/schema";

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
  const commentRows = await db
    .select({ id: comments.id, isDeleted: comments.isDeleted })
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1);
  if (commentRows.length === 0) {
    return NextResponse.json({ message: "评论不存在" }, { status: 404 });
  }
  if (commentRows[0].isDeleted === 1) {
    return NextResponse.json({ message: "评论已删除" }, { status: 409 });
  }

  const existing = await db
    .select()
    .from(commentLikes)
    .where(and(eq(commentLikes.commentId, id), eq(commentLikes.userId, user.id)))
    .limit(1);

  if (existing.length > 0) {
    await db
      .delete(commentLikes)
      .where(and(eq(commentLikes.commentId, id), eq(commentLikes.userId, user.id)));
  } else {
    await db.insert(commentLikes).values({
      commentId: id,
      userId: user.id,
      createdAt: Date.now(),
    });
  }

  const countRows = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(commentLikes)
    .where(eq(commentLikes.commentId, id));
  const likeCount = countRows[0]?.count ?? 0;

  return NextResponse.json({ liked: existing.length === 0, likeCount });
}
