import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { clues, roles, scriptSections, scripts } from "@/lib/db/schema";
import { getScriptDetail } from "@/lib/data";
import { normalizeTags } from "@/lib/utils";
import { syncScriptTags } from "@/lib/tags";

export const runtime = "edge";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const detail = await getScriptDetail(id);
  if (!detail) {
    return NextResponse.json({ message: "未找到剧本" }, { status: 404 });
  }

  const user = await getCurrentUser();
  const isOwner = user?.id === detail.script.authorId;
  if (!detail.script.isPublic && !isOwner) {
    return NextResponse.json({ message: "无权限" }, { status: 403 });
  }

  return NextResponse.json({
    script: detail.script,
    sections: detail.sections,
    roles: detail.roles,
    clues: detail.clues,
    tags: detail.tags,
    rating: detail.rating,
  });
}

export async function PUT(request: Request, { params }: RouteContext) {
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

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const title = String(body?.title ?? "").trim();
  const summary = String(body?.summary ?? "").trim();
  const isPublic = Boolean(body?.isPublic);
  const allowFork = Boolean(body?.allowFork);
  const sections = body?.sections ?? {};
  const rolesInput = Array.isArray(body?.roles) ? body.roles : [];
  const cluesInput = Array.isArray(body?.clues) ? body.clues : [];
  const tagsInput = String(body?.tags ?? "");

  if (!title) {
    return NextResponse.json({ message: "标题不能为空" }, { status: 400 });
  }

  const db = getDb();
  const now = Date.now();

  await db
    .update(scripts)
    .set({
      title,
      summary: summary || null,
      isPublic: isPublic ? 1 : 0,
      allowFork: allowFork ? 1 : 0,
      updatedAt: now,
    })
    .where(eq(scripts.id, id));

  const existingSections = detail.sections;
  const outlineSection = existingSections.find((section) => section.sectionType === "outline");
  const dmSection = existingSections.find((section) => section.sectionType === "dm");

  if (outlineSection) {
    await db
      .update(scriptSections)
      .set({ contentMd: String(sections.outline ?? "") })
      .where(eq(scriptSections.id, outlineSection.id));
  } else {
    await db.insert(scriptSections).values({
      id: crypto.randomUUID(),
      scriptId: id,
      sectionType: "outline",
      contentMd: String(sections.outline ?? ""),
    });
  }

  if (dmSection) {
    await db
      .update(scriptSections)
      .set({ contentMd: String(sections.dm ?? "") })
      .where(eq(scriptSections.id, dmSection.id));
  } else {
    await db.insert(scriptSections).values({
      id: crypto.randomUUID(),
      scriptId: id,
      sectionType: "dm",
      contentMd: String(sections.dm ?? ""),
    });
  }

  await db.delete(roles).where(eq(roles.scriptId, id));
  const roleRows = rolesInput
    .map((role: any) => ({
      id: String(role.id ?? crypto.randomUUID()),
      scriptId: id,
      name: String(role.name ?? "").trim(),
      contentMd: String(role.contentMd ?? ""),
    }))
    .filter((role: any) => role.name || role.contentMd);

  if (roleRows.length > 0) {
    await db.insert(roles).values(roleRows);
  }

  await db.delete(clues).where(eq(clues.scriptId, id));
  const clueRows = cluesInput
    .map((clue: any) => ({
      id: String(clue.id ?? crypto.randomUUID()),
      scriptId: id,
      title: String(clue.title ?? "").trim(),
      contentMd: String(clue.contentMd ?? ""),
    }))
    .filter((clue: any) => clue.title || clue.contentMd);

  if (clueRows.length > 0) {
    await db.insert(clues).values(clueRows);
  }

  const tags = normalizeTags(tagsInput);
  await syncScriptTags(id, tags);

  return NextResponse.json({ ok: true });
}
