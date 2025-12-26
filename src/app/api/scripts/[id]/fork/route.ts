import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { clues, roles, scriptSections, scripts } from "@/lib/db/schema";
import { getScriptDetail } from "@/lib/data";
import { syncScriptTags } from "@/lib/tags";

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

  if (detail.script.isPublic !== 1 || detail.script.allowFork !== 1) {
    return NextResponse.json({ message: "该剧本不可 Fork" }, { status: 403 });
  }

  const db = getDb();
  const now = Date.now();
  const newId = crypto.randomUUID();
  const rootId = detail.script.rootId ?? detail.script.id;

  await db.insert(scripts).values({
    id: newId,
    authorId: user.id,
    title: `${detail.script.title}（Fork）`,
    summary: detail.script.summary,
    coverUrl: detail.script.coverUrl,
    isPublic: 0,
    allowFork: 0,
    rootId,
    parentId: detail.script.id,
    createdAt: now,
    updatedAt: now,
  });

  if (detail.sections.length > 0) {
    await db.insert(scriptSections).values(
      detail.sections.map((section) => ({
        id: crypto.randomUUID(),
        scriptId: newId,
        sectionType: section.sectionType,
        contentMd: section.contentMd,
      }))
    );
  }

  if (detail.roles.length > 0) {
    await db.insert(roles).values(
      detail.roles.map((role) => ({
        id: crypto.randomUUID(),
        scriptId: newId,
        name: role.name,
        contentMd: role.contentMd,
      }))
    );
  }

  if (detail.clues.length > 0) {
    await db.insert(clues).values(
      detail.clues.map((clue) => ({
        id: crypto.randomUUID(),
        scriptId: newId,
        title: clue.title,
        contentMd: clue.contentMd,
      }))
    );
  }

  await syncScriptTags(newId, detail.tags);

  return NextResponse.json({ id: newId });
}
