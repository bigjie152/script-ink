import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import { getTruthLock, upsertTruthLock } from "@/services/truth_lock_controller";

export const runtime = "edge";

type TruthLockBody = {
  truth?: string;
};

const ensureOwner = async (scriptId: string, userId: string) => {
  const db = getDb();
  const rows = await db
    .select()
    .from(scripts)
    .where(and(
      eq(scripts.id, scriptId),
      eq(scripts.authorId, userId),
      isNull(scripts.deletedAt)
    ))
    .limit(1);
  return rows[0];
};

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const script = await ensureOwner(id, user.id);
  if (!script) {
    return NextResponse.json({ message: "无权限查看真相锁定。" }, { status: 403 });
  }

  const truthLock = await getTruthLock(id);
  return NextResponse.json({
    locked: Boolean(truthLock),
    truthLock,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const script = await ensureOwner(id, user.id);
  if (!script) {
    return NextResponse.json({ message: "无权限锁定真相。" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as TruthLockBody | null;
  const truth = body?.truth?.trim() ?? "";
  if (!truth) {
    return NextResponse.json({ message: "请先填写真相内容。" }, { status: 400 });
  }

  await upsertTruthLock(id, truth);

  return NextResponse.json({ ok: true });
}
