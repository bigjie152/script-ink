import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { scriptEntities, scripts } from "@/lib/db/schema";
import { getScriptDetail } from "@/lib/data";
import { syncScriptTags } from "@/lib/tags";
import { ensureScriptEntities, type ScriptEntityPayload } from "@/services/script_entity_service";

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
    return NextResponse.json({ message: "该剧本不可改编" }, { status: 403 });
  }

  const db = getDb();
  const now = Date.now();
  const newId = crypto.randomUUID();
  const rootId = detail.script.rootId ?? detail.script.id;

  await db.insert(scripts).values({
    id: newId,
    authorId: user.id,
    title: `${detail.script.title}（改编）`,
    summary: detail.script.summary,
    coverUrl: detail.script.coverUrl,
    isPublic: 0,
    allowFork: 0,
    rootId,
    parentId: detail.script.id,
    createdAt: now,
    updatedAt: now,
  });

  const sourceEntities = await ensureScriptEntities(id);
  const idMap = new Map(sourceEntities.map((entity) => [entity.id, crypto.randomUUID()]));

  const remapMentions = (node: unknown): unknown => {
    if (!node || typeof node !== "object") return node;
    const typed = node as { type?: string; attrs?: Record<string, unknown>; content?: unknown[] };
    const next: typeof typed = { ...typed };

    if (typed.type === "entity_mention" && typed.attrs?.entityId) {
      const mapped = idMap.get(String(typed.attrs.entityId));
      if (mapped) {
        next.attrs = { ...typed.attrs, entityId: mapped };
      }
    }

    if (Array.isArray(typed.content)) {
      next.content = typed.content.map(remapMentions) as unknown[];
    }
    return next;
  };

  const remapProps = (entity: ScriptEntityPayload) => {
    if (entity.type === "clue") {
      const targetId = entity.props?.targetId;
      if (typeof targetId === "string") {
        const mapped = idMap.get(targetId);
        if (mapped) {
          return { ...entity.props, targetId: mapped };
        }
      }
    }
    if (entity.type === "flow_node") {
      const clueIds = entity.props?.clueIds;
      if (Array.isArray(clueIds)) {
        const mapped = clueIds.map((id) => idMap.get(String(id)) ?? id);
        return { ...entity.props, clueIds: mapped };
      }
    }
    return entity.props;
  };

  await db.insert(scriptEntities).values(
    sourceEntities.map((entity) => ({
      id: idMap.get(entity.id) ?? crypto.randomUUID(),
      scriptId: newId,
      type: entity.type,
      title: entity.title,
      contentJson: JSON.stringify(remapMentions(entity.content)),
      propsJson: JSON.stringify(remapProps(entity) ?? {}),
      createdAt: now,
      updatedAt: now,
    }))
  );

  await syncScriptTags(newId, detail.tags);

  return NextResponse.json({ id: newId });
}
