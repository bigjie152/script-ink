import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { getScriptDetail } from "@/lib/data";

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

  const detail = await getScriptDetail(id);
  if (!detail) {
    return NextResponse.json({ message: "未找到剧本" }, { status: 404 });
  }

  if (detail.script.authorId !== user.id) {
    return NextResponse.json({ message: "无权限" }, { status: 403 });
  }

  if (detail.script.isPublic === 1) {
    return NextResponse.json({ ok: true });
  }

  const db = getDb();
  await db
    .update(scripts)
    .set({ isPublic: 1, updatedAt: Date.now() })
    .where(eq(scripts.id, id));

  return NextResponse.json({ ok: true });
}
