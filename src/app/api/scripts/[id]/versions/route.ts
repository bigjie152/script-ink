import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { scriptVersions, scripts, users } from "@/lib/db/schema";

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
    .where(eq(scripts.id, id))
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
      id: scriptVersions.id,
      summary: scriptVersions.summary,
      createdAt: scriptVersions.createdAt,
      authorId: scriptVersions.authorId,
      authorName: users.displayName,
    })
    .from(scriptVersions)
    .leftJoin(users, eq(users.id, scriptVersions.authorId))
    .where(eq(scriptVersions.scriptId, id))
    .orderBy(scriptVersions.createdAt);

  return NextResponse.json({
    versions: rows.map((row) => ({
      id: row.id,
      summary: row.summary,
      createdAt: row.createdAt,
      authorId: row.authorId,
      authorName: row.authorName ?? "匿名",
    })),
  });
}
