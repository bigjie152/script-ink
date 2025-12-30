import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { scriptMergeRequests, scripts, users } from "@/lib/db/schema";

export const runtime = "edge";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const db = getDb();
  const scriptRows = await db
    .select({ authorId: scripts.authorId, isPublic: scripts.isPublic })
    .from(scripts)
    .where(and(eq(scripts.id, id), isNull(scripts.deletedAt)))
    .limit(1);
  if (scriptRows.length === 0) {
    return NextResponse.json({ message: "未找到剧本" }, { status: 404 });
  }

  const user = await getCurrentUser();
  if (scriptRows[0].isPublic !== 1 && user?.id !== scriptRows[0].authorId) {
    return NextResponse.json({ message: "无权限" }, { status: 403 });
  }

  const rows = await db
    .select({
      id: scriptMergeRequests.id,
      status: scriptMergeRequests.status,
      summary: scriptMergeRequests.summary,
      createdAt: scriptMergeRequests.createdAt,
      updatedAt: scriptMergeRequests.updatedAt,
      authorId: scriptMergeRequests.authorId,
      authorName: users.displayName,
      sourceId: scriptMergeRequests.sourceScriptId,
      sourceTitle: scripts.title,
    })
    .from(scriptMergeRequests)
    .innerJoin(scripts, eq(scripts.id, scriptMergeRequests.sourceScriptId))
    .leftJoin(users, eq(users.id, scriptMergeRequests.authorId))
    .where(eq(scriptMergeRequests.targetScriptId, id))
    .orderBy(scriptMergeRequests.createdAt);

  return NextResponse.json({
    requests: rows.map((row) => ({
      id: row.id,
      status: row.status,
      summary: row.summary,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      authorId: row.authorId,
      authorName: row.authorName ?? "匿名",
      sourceId: row.sourceId,
      sourceTitle: row.sourceTitle ?? "未命名剧本",
    })),
  });
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const sourceId = String(body?.sourceId ?? "").trim();
  const summary = String(body?.summary ?? "").trim();
  if (!sourceId || !summary) {
    return NextResponse.json({ message: "请填写改编来源与说明" }, { status: 400 });
  }

  const db = getDb();
  const targetRows = await db
    .select({ id: scripts.id, authorId: scripts.authorId, rootId: scripts.rootId })
    .from(scripts)
    .where(and(eq(scripts.id, id), isNull(scripts.deletedAt)))
    .limit(1);
  if (targetRows.length === 0) {
    return NextResponse.json({ message: "未找到剧本" }, { status: 404 });
  }

  const sourceRows = await db
    .select({ id: scripts.id, authorId: scripts.authorId, rootId: scripts.rootId })
    .from(scripts)
    .where(and(eq(scripts.id, sourceId), isNull(scripts.deletedAt)))
    .limit(1);
  if (sourceRows.length === 0) {
    return NextResponse.json({ message: "改编来源不存在" }, { status: 404 });
  }
  if (sourceRows[0].authorId !== user.id) {
    return NextResponse.json({ message: "只能提交自己的改编作品" }, { status: 403 });
  }
  if (sourceRows[0].id === targetRows[0].id) {
    return NextResponse.json({ message: "不能提交同一剧本" }, { status: 400 });
  }

  const targetRootId = targetRows[0].rootId ?? targetRows[0].id;
  const sourceRootId = sourceRows[0].rootId ?? sourceRows[0].id;
  if (targetRootId !== sourceRootId) {
    return NextResponse.json({ message: "仅支持同一剧本谱系的合并" }, { status: 400 });
  }

  const existing = await db
    .select({ id: scriptMergeRequests.id, status: scriptMergeRequests.status })
    .from(scriptMergeRequests)
    .where(
      and(
        eq(scriptMergeRequests.sourceScriptId, sourceId),
        eq(scriptMergeRequests.targetScriptId, id)
      )
    )
    .limit(1);

  if (existing.length > 0 && existing[0].status === "pending") {
    return NextResponse.json({ message: "已有待处理申请" }, { status: 409 });
  }

  const now = Date.now();
  const requestId = crypto.randomUUID();
  await db.insert(scriptMergeRequests).values({
    id: requestId,
    sourceScriptId: sourceId,
    targetScriptId: id,
    authorId: user.id,
    summary,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ id: requestId });
}
