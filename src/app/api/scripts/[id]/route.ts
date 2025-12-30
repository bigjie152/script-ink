import { NextResponse } from "next/server";
import { and, eq, inArray, or } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import {
  clues,
  commentLikes,
  comments,
  ratings,
  roles,
  scriptArchives,
  scriptFavorites,
  scriptIssues,
  scriptLikes,
  scriptMergeRequests,
  scriptSections,
  scriptTags,
  scriptVersions,
  scripts,
} from "@/lib/db/schema";
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
  const sections = (body?.sections ?? {}) as Record<string, unknown>;
  type RoleInput = {
    id?: string;
    name?: string;
    contentMd?: string;
    taskMd?: string;
  };
  type ClueInput = {
    id?: string;
    title?: string;
    contentMd?: string;
    triggerMd?: string;
  };

  const rolesInput = Array.isArray(body?.roles)
    ? (body.roles as RoleInput[])
    : [];
  const cluesInput = Array.isArray(body?.clues)
    ? (body.clues as ClueInput[])
    : [];
  const tagsInput = String(body?.tags ?? "");
  const versionNote = String(body?.versionNote ?? "").trim();

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
  const dmBackgroundContent = String(sections.dmBackground ?? "");
  const dmFlowContent = String(sections.dmFlow ?? "");
  const truthContent = String(sections.truth ?? "");

  const dmBackgroundSection = existingSections.find(
    (section) => section.sectionType === "dm_background"
  );
  const dmFlowSection = existingSections.find(
    (section) => section.sectionType === "dm_flow"
  );
  const truthSection = existingSections.find(
    (section) => section.sectionType === "truth"
  );

  if (dmBackgroundSection) {
    await db
      .update(scriptSections)
      .set({ contentMd: dmBackgroundContent })
      .where(eq(scriptSections.id, dmBackgroundSection.id));
  } else {
    await db.insert(scriptSections).values({
      id: crypto.randomUUID(),
      scriptId: id,
      sectionType: "dm_background",
      contentMd: dmBackgroundContent,
    });
  }

  if (dmFlowSection) {
    await db
      .update(scriptSections)
      .set({ contentMd: dmFlowContent })
      .where(eq(scriptSections.id, dmFlowSection.id));
  } else {
    await db.insert(scriptSections).values({
      id: crypto.randomUUID(),
      scriptId: id,
      sectionType: "dm_flow",
      contentMd: dmFlowContent,
    });
  }

  if (truthSection) {
    await db
      .update(scriptSections)
      .set({ contentMd: truthContent })
      .where(eq(scriptSections.id, truthSection.id));
  } else {
    await db.insert(scriptSections).values({
      id: crypto.randomUUID(),
      scriptId: id,
      sectionType: "truth",
      contentMd: truthContent,
    });
  }

  await db.delete(roles).where(eq(roles.scriptId, id));
  const roleRows = rolesInput
    .map((role) => ({
      id: String(role.id ?? crypto.randomUUID()),
      scriptId: id,
      name: String(role.name ?? "").trim(),
      contentMd: String(role.contentMd ?? ""),
      taskMd: String(role.taskMd ?? ""),
    }))
    .filter((role) => role.name || role.contentMd || role.taskMd);

  if (roleRows.length > 0) {
    await db.insert(roles).values(roleRows);
  }

  await db.delete(clues).where(eq(clues.scriptId, id));
  const clueRows = cluesInput
    .map((clue) => ({
      id: String(clue.id ?? crypto.randomUUID()),
      scriptId: id,
      title: String(clue.title ?? "").trim(),
      contentMd: String(clue.contentMd ?? ""),
      triggerMd: String(clue.triggerMd ?? ""),
    }))
    .filter((clue) => clue.title || clue.contentMd || clue.triggerMd);

  if (clueRows.length > 0) {
    await db.insert(clues).values(clueRows);
  }

  const tags = normalizeTags(tagsInput);
  await syncScriptTags(id, tags);

  if (versionNote) {
    await db.insert(scriptVersions).values({
      id: crypto.randomUUID(),
      scriptId: id,
      authorId: user.id,
      summary: versionNote,
      createdAt: now,
    });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const db = getDb();
  const scriptRows = await db
    .select({ authorId: scripts.authorId, deletedAt: scripts.deletedAt })
    .from(scripts)
    .where(eq(scripts.id, id))
    .limit(1);

  if (scriptRows.length === 0) {
    return NextResponse.json({ message: "未找到剧本" }, { status: 404 });
  }

  if (scriptRows[0].authorId !== user.id) {
    return NextResponse.json({ message: "无权限" }, { status: 403 });
  }

  if (scriptRows[0].deletedAt) {
    return NextResponse.json({ ok: true });
  }

  const detail = await getScriptDetail(id);
  if (!detail) {
    return NextResponse.json({ message: "未找到剧本" }, { status: 404 });
  }

  const now = Date.now();
  const archivePayload = {
    script: detail.script,
    sections: detail.sections,
    roles: detail.roles,
    clues: detail.clues,
    tags: detail.tags,
    archivedAt: now,
  };

  await db.delete(scriptArchives).where(eq(scriptArchives.scriptId, id));
  await db.insert(scriptArchives).values({
    id: crypto.randomUUID(),
    scriptId: id,
    payload: JSON.stringify(archivePayload),
    createdAt: now,
  });

  const commentRows = await db
    .select({ id: comments.id })
    .from(comments)
    .where(eq(comments.scriptId, id));
  const commentIds = commentRows.map((row) => row.id);
  if (commentIds.length > 0) {
    await db.delete(commentLikes).where(inArray(commentLikes.commentId, commentIds));
  }

  await db.delete(comments).where(eq(comments.scriptId, id));
  await db.delete(ratings).where(eq(ratings.scriptId, id));
  await db.delete(scriptLikes).where(eq(scriptLikes.scriptId, id));
  await db.delete(scriptFavorites).where(eq(scriptFavorites.scriptId, id));
  await db.delete(scriptIssues).where(eq(scriptIssues.scriptId, id));
  await db.delete(scriptMergeRequests).where(
    or(eq(scriptMergeRequests.sourceScriptId, id), eq(scriptMergeRequests.targetScriptId, id))
  );
  await db.delete(scriptVersions).where(eq(scriptVersions.scriptId, id));
  await db.delete(scriptTags).where(eq(scriptTags.scriptId, id));
  await db.delete(clues).where(eq(clues.scriptId, id));
  await db.delete(roles).where(eq(roles.scriptId, id));
  await db.delete(scriptSections).where(eq(scriptSections.scriptId, id));
  await db
    .update(scripts)
    .set({ isPublic: 0, allowFork: 0, deletedAt: now, updatedAt: now })
    .where(eq(scripts.id, id));

  return NextResponse.json({ ok: true });
}
