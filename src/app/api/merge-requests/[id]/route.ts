import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { scriptMergeRequests, scripts } from "@/lib/db/schema";

export const runtime = "edge";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const STATUS_SET = new Set(["accepted", "rejected", "pending"]);

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
      id: scriptMergeRequests.id,
      targetScriptId: scriptMergeRequests.targetScriptId,
    })
    .from(scriptMergeRequests)
    .where(eq(scriptMergeRequests.id, id))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({ message: "合并申请不存在" }, { status: 404 });
  }

  const targetRows = await db
    .select({ authorId: scripts.authorId })
    .from(scripts)
    .where(eq(scripts.id, rows[0].targetScriptId))
    .limit(1);

  if (targetRows.length === 0) {
    return NextResponse.json({ message: "目标剧本不存在" }, { status: 404 });
  }

  if (targetRows[0].authorId !== user.id) {
    return NextResponse.json({ message: "无权限" }, { status: 403 });
  }

  await db
    .update(scriptMergeRequests)
    .set({ status, updatedAt: Date.now() })
    .where(eq(scriptMergeRequests.id, id));

  return NextResponse.json({ ok: true });
}
