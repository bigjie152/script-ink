import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { scriptIssues, scripts, users } from "@/lib/db/schema";

export const runtime = "edge";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const ISSUE_TYPES = new Set(["逻辑冲突", "线索缺失", "DM提示", "体验反馈"]);

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
      id: scriptIssues.id,
      type: scriptIssues.type,
      title: scriptIssues.title,
      content: scriptIssues.content,
      status: scriptIssues.status,
      createdAt: scriptIssues.createdAt,
      updatedAt: scriptIssues.updatedAt,
      authorId: scriptIssues.authorId,
      authorName: users.displayName,
    })
    .from(scriptIssues)
    .leftJoin(users, eq(users.id, scriptIssues.authorId))
    .where(eq(scriptIssues.scriptId, id))
    .orderBy(scriptIssues.createdAt);

  return NextResponse.json({
    issues: rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      content: row.content,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      authorId: row.authorId,
      authorName: row.authorName ?? "匿名",
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
  const type = String(body?.type ?? "").trim();
  const title = String(body?.title ?? "").trim();
  const content = String(body?.content ?? "").trim();

  if (!ISSUE_TYPES.has(type)) {
    return NextResponse.json({ message: "请选择问题类型" }, { status: 400 });
  }
  if (!title || !content) {
    return NextResponse.json({ message: "标题和内容不能为空" }, { status: 400 });
  }

  const db = getDb();
  const scriptRows = await db
    .select({ authorId: scripts.authorId, isPublic: scripts.isPublic })
    .from(scripts)
    .where(and(eq(scripts.id, id), isNull(scripts.deletedAt)))
    .limit(1);
  if (scriptRows.length === 0) {
    return NextResponse.json({ message: "未找到剧本" }, { status: 404 });
  }
  if (scriptRows[0].isPublic !== 1 && scriptRows[0].authorId !== user.id) {
    return NextResponse.json({ message: "无权限" }, { status: 403 });
  }

  const now = Date.now();
  const issueId = crypto.randomUUID();
  await db.insert(scriptIssues).values({
    id: issueId,
    scriptId: id,
    authorId: user.id,
    type,
    title,
    content,
    status: "open",
    createdAt: now,
    updatedAt: now,
  });

  return NextResponse.json({ id: issueId });
}
