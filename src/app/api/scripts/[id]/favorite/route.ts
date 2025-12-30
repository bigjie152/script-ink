import { NextResponse } from "next/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { scriptFavorites, scripts } from "@/lib/db/schema";

export const runtime = "edge";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const DEFAULT_FOLDER = "默认收藏夹";
const MAX_FOLDER_LENGTH = 24;

const normalizeFolder = (raw: string) => {
  const folder = raw.trim() || DEFAULT_FOLDER;
  return folder.length > MAX_FOLDER_LENGTH ? folder.slice(0, MAX_FOLDER_LENGTH) : folder;
};

const getCounts = async (db: ReturnType<typeof getDb>, scriptId: string) => {
  const countRows = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(scriptFavorites)
    .where(eq(scriptFavorites.scriptId, scriptId));
  return countRows[0]?.count ?? 0;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
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

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const folder = normalizeFolder(String(body?.folder ?? ""));

  const existing = await db
    .select({ folder: scriptFavorites.folder })
    .from(scriptFavorites)
    .where(and(eq(scriptFavorites.scriptId, id), eq(scriptFavorites.userId, user.id)))
    .limit(1);

  if (existing.length === 0) {
    await db.insert(scriptFavorites).values({
      scriptId: id,
      userId: user.id,
      folder,
      createdAt: Date.now(),
    });
  } else if (existing[0].folder !== folder) {
    await db
      .update(scriptFavorites)
      .set({ folder })
      .where(and(eq(scriptFavorites.scriptId, id), eq(scriptFavorites.userId, user.id)));
  }

  const favoriteCount = await getCounts(db, id);
  return NextResponse.json({
    favorited: true,
    favoriteCount,
    favoriteFolder: folder,
  });
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const folder = normalizeFolder(String(body?.folder ?? ""));

  const db = getDb();
  const existing = await db
    .select()
    .from(scriptFavorites)
    .where(and(eq(scriptFavorites.scriptId, id), eq(scriptFavorites.userId, user.id)))
    .limit(1);
  if (existing.length === 0) {
    return NextResponse.json({ message: "请先收藏再移动" }, { status: 404 });
  }

  await db
    .update(scriptFavorites)
    .set({ folder })
    .where(and(eq(scriptFavorites.scriptId, id), eq(scriptFavorites.userId, user.id)));

  const favoriteCount = await getCounts(db, id);
  return NextResponse.json({
    favorited: true,
    favoriteCount,
    favoriteFolder: folder,
  });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const db = getDb();
  await db
    .delete(scriptFavorites)
    .where(and(eq(scriptFavorites.scriptId, id), eq(scriptFavorites.userId, user.id)));

  const favoriteCount = await getCounts(db, id);
  return NextResponse.json({
    favorited: false,
    favoriteCount,
  });
}
