import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { scriptIssues, scripts } from "@/lib/db/schema";

export const runtime = "edge";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const STATUS_SET = new Set(["open", "closed"]);

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const status = String(body?.status ?? "").trim();
  if (!STATUS_SET.has(status)) {
    return NextResponse.json({ message: "状态不合法" }, { status: 400 });
  }

  const db = getDb();
  const rows = await db
    .select({
      id: scriptIssues.id,
      scriptId: scriptIssues.scriptId,
      authorId: scriptIssues.authorId,
    })
    .from(scriptIssues)
    .where(eq(scriptIssues.id, id))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ message: "问题单不存在" }, { status: 404 });
  }

  const scriptRows = await db
    .select({ authorId: scripts.authorId })
    .from(scripts)
    .where(eq(scripts.id, rows[0].scriptId))
    .limit(1);

  if (scriptRows.length === 0) {
    return NextResponse.json({ message: "剧本不存在" }, { status: 404 });
  }

  const canManage = rows[0].authorId === user.id || scriptRows[0].authorId === user.id;
  if (!canManage) {
    return NextResponse.json({ message: "无权限" }, { status: 403 });
  }

  await db
    .update(scriptIssues)
    .set({ status, updatedAt: Date.now() })
    .where(eq(scriptIssues.id, id));

  return NextResponse.json({ ok: true });
}
