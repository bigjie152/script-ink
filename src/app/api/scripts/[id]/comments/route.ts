import { NextResponse } from "next/server";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { commentLikes, comments, scripts, users } from "@/lib/db/schema";

export const runtime = "edge";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const COMMENT_MAX_LENGTH = 1000;

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const db = getDb();
  const scriptRows = await db
    .select()
    .from(scripts)
    .where(and(eq(scripts.id, id), isNull(scripts.deletedAt)))
    .limit(1);
  if (scriptRows.length === 0) {
    return NextResponse.json({ message: "未找到剧本" }, { status: 404 });
  }

  if (scriptRows[0].isPublic !== 1) {
    return NextResponse.json({ message: "该剧本未公开" }, { status: 403 });
  }

  const user = await getCurrentUser();
  const commentRows = await db
    .select({
      id: comments.id,
      parentId: comments.parentId,
      scriptId: comments.scriptId,
      authorId: comments.authorId,
      authorName: users.displayName,
      content: comments.content,
      isDeleted: comments.isDeleted,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
    })
    .from(comments)
    .leftJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.scriptId, id))
    .orderBy(comments.createdAt);

  if (commentRows.length === 0) {
    return NextResponse.json({ comments: [] });
  }

  const commentIds = commentRows.map((row) => row.id);
  const likeRows = await db
    .select({
      commentId: commentLikes.commentId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(commentLikes)
    .where(inArray(commentLikes.commentId, commentIds))
    .groupBy(commentLikes.commentId);

  const likedMap = new Set<string>();
  if (user) {
    const likedRows = await db
      .select({ commentId: commentLikes.commentId })
      .from(commentLikes)
      .where(and(eq(commentLikes.userId, user.id), inArray(commentLikes.commentId, commentIds)));
    for (const row of likedRows) {
      likedMap.add(row.commentId);
    }
  }

  const likeMap = new Map<string, number>();
  for (const row of likeRows) {
    likeMap.set(row.commentId, row.count);
  }

  const payload = commentRows.map((row) => ({
    id: row.id,
    parentId: row.parentId,
    scriptId: row.scriptId,
    authorId: row.authorId,
    authorName: row.authorName ?? "匿名",
    content: row.content,
    isDeleted: row.isDeleted === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    likeCount: likeMap.get(row.id) ?? 0,
    liked: likedMap.has(row.id),
  }));

  return NextResponse.json({ comments: payload });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const content = String(body?.content ?? "").trim();
  const parentId = String(body?.parentId ?? "").trim();

  if (!content) {
    return NextResponse.json({ message: "评论内容不能为空" }, { status: 400 });
  }

  if (content.length > COMMENT_MAX_LENGTH) {
    return NextResponse.json({ message: "评论内容过长" }, { status: 400 });
  }

  const db = getDb();
  const scriptRows = await db
    .select()
    .from(scripts)
    .where(and(eq(scripts.id, id), isNull(scripts.deletedAt)))
    .limit(1);
  if (scriptRows.length === 0) {
    return NextResponse.json({ message: "未找到剧本" }, { status: 404 });
  }
  if (scriptRows[0].isPublic !== 1) {
    return NextResponse.json({ message: "该剧本未公开" }, { status: 403 });
  }

  let resolvedParentId: string | null = null;
  if (parentId) {
    const parentRows = await db
      .select({ id: comments.id, scriptId: comments.scriptId })
      .from(comments)
      .where(eq(comments.id, parentId))
      .limit(1);
    if (parentRows.length === 0 || parentRows[0].scriptId !== id) {
      return NextResponse.json({ message: "回复目标不存在" }, { status: 404 });
    }
    resolvedParentId = parentRows[0].id;
  }

  const now = Date.now();
  const commentId = crypto.randomUUID();
  await db.insert(comments).values({
    id: commentId,
    scriptId: id,
    authorId: user.id,
    parentId: resolvedParentId,
    content,
    isDeleted: 0,
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ id: commentId });
}
