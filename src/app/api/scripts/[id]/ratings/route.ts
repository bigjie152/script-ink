import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ratings, scripts } from "@/lib/db/schema";
import { clampScore } from "@/lib/utils";

export const runtime = "edge";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const logicScore = clampScore(Number(body?.logicScore ?? 0));
  const proseScore = clampScore(Number(body?.proseScore ?? 0));
  const trickScore = clampScore(Number(body?.trickScore ?? 0));

  const db = getDb();
  const scriptRows = await db.select().from(scripts).where(eq(scripts.id, id)).limit(1);
  if (scriptRows.length === 0) {
    return NextResponse.json({ message: "未找到剧本" }, { status: 404 });
  }

  if (scriptRows[0].isPublic !== 1) {
    return NextResponse.json({ message: "该剧本未公开" }, { status: 403 });
  }

  const existing = await db
    .select()
    .from(ratings)
    .where(and(eq(ratings.scriptId, id), eq(ratings.userId, user.id)))
    .limit(1);

  const now = Date.now();

  if (existing.length > 0) {
    await db
      .update(ratings)
      .set({
        logicScore,
        proseScore,
        trickScore,
        updatedAt: now,
      })
      .where(eq(ratings.id, existing[0].id));
  } else {
    await db.insert(ratings).values({
      id: crypto.randomUUID(),
      scriptId: id,
      userId: user.id,
      logicScore,
      proseScore,
      trickScore,
      createdAt: now,
      updatedAt: now,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const db = getDb();
  const rows = await db.select().from(ratings).where(eq(ratings.scriptId, id));
  return NextResponse.json({ count: rows.length });
}
