import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { commentLikes, comments } from "@/lib/db/schema";

export const runtime = "edge";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const COMMENT_MAX_LENGTH = 1000;

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const content = String(body?.content ?? "").trim();
  if (!content) {
    return NextResponse.json({ message: "评论内容不能为空" }, { status: 400 });
  }
  if (content.length > COMMENT_MAX_LENGTH) {
    return NextResponse.json({ message: "评论内容过长" }, { status: 400 });
  }

  const db = getDb();
  const rows = await db
    .select({ authorId: comments.authorId, isDeleted: comments.isDeleted })
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1);
  if (rows.length === 0) {
    return NextResponse.json({ message: "评论不存在" }, { status: 404 });
  }
  if (rows[0].authorId !== user.id) {
    return NextResponse.json({ message: "无权限" }, { status: 403 });
  }
  if (rows[0].isDeleted === 1) {
    return NextResponse.json({ message: "评论已删除" }, { status: 409 });
  }

  await db
    .update(comments)
    .set({ content, updatedAt: Date.now() })
    .where(eq(comments.id, id));

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const db = getDb();
  const rows = await db
    .select({ authorId: comments.authorId, isDeleted: comments.isDeleted })
    .from(comments)
    .where(eq(comments.id, id))
    .limit(1);
  if (rows.length === 0) {
    return NextResponse.json({ message: "评论不存在" }, { status: 404 });
  }
  if (rows[0].authorId !== user.id) {
    return NextResponse.json({ message: "无权限" }, { status: 403 });
  }
  if (rows[0].isDeleted === 1) {
    return NextResponse.json({ ok: true });
  }

  await db
    .update(comments)
    .set({ content: "", isDeleted: 1, updatedAt: Date.now() })
    .where(eq(comments.id, id));
  await db.delete(commentLikes).where(eq(commentLikes.commentId, id));

  return NextResponse.json({ ok: true });
}
