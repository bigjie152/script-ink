import { NextResponse } from "next/server";
import { and, eq, inArray, ne, or, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  clues,
  commentLikes,
  comments,
  ratings,
  roles,
  scriptArchives,
  scriptFavorites,
  scriptIssues,
  scriptLikes,
  scriptMergeRequests,
  scriptSections,
  scriptTags,
  scriptVersions,
  scripts,
} from "@/lib/db/schema";

export const runtime = "edge";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const db = getDb();
  const scriptRows = await db
    .select({ authorId: scripts.authorId, deletedAt: scripts.deletedAt })
    .from(scripts)
    .where(eq(scripts.id, id))
    .limit(1);

  if (scriptRows.length === 0) {
    return NextResponse.json({ message: "未找到剧本" }, { status: 404 });
  }
  if (scriptRows[0].authorId !== user.id) {
    return NextResponse.json({ message: "无权限" }, { status: 403 });
  }
  if (!scriptRows[0].deletedAt) {
    return NextResponse.json({ message: "剧本未删除，无法清理墓碑" }, { status: 409 });
  }

  const forkRows = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(scripts)
    .where(
      or(
        eq(scripts.parentId, id),
        and(eq(scripts.rootId, id), ne(scripts.id, id))
      )
    );

  if ((forkRows[0]?.count ?? 0) > 0) {
    return NextResponse.json({ message: "已有改编，无法清理墓碑" }, { status: 409 });
  }

  const commentRows = await db
    .select({ id: comments.id })
    .from(comments)
    .where(eq(comments.scriptId, id));
  const commentIds = commentRows.map((row) => row.id);
  if (commentIds.length > 0) {
    await db.delete(commentLikes).where(inArray(commentLikes.commentId, commentIds));
  }

  await db.delete(comments).where(eq(comments.scriptId, id));
  await db.delete(ratings).where(eq(ratings.scriptId, id));
  await db.delete(scriptLikes).where(eq(scriptLikes.scriptId, id));
  await db.delete(scriptFavorites).where(eq(scriptFavorites.scriptId, id));
  await db.delete(scriptIssues).where(eq(scriptIssues.scriptId, id));
  await db.delete(scriptMergeRequests).where(
    or(eq(scriptMergeRequests.sourceScriptId, id), eq(scriptMergeRequests.targetScriptId, id))
  );
  await db.delete(scriptVersions).where(eq(scriptVersions.scriptId, id));
  await db.delete(scriptTags).where(eq(scriptTags.scriptId, id));
  await db.delete(clues).where(eq(clues.scriptId, id));
  await db.delete(roles).where(eq(roles.scriptId, id));
  await db.delete(scriptSections).where(eq(scriptSections.scriptId, id));
  await db.delete(scriptArchives).where(eq(scriptArchives.scriptId, id));
  await db.delete(scripts).where(eq(scripts.id, id));

  return NextResponse.json({ ok: true });
}
