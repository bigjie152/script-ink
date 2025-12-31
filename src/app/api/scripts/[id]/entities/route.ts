import { NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { scripts } from "@/lib/db/schema";
import {
  ensureScriptEntities,
  getScriptTags,
  upsertScriptEntities,
  updateScriptMeta,
  type ScriptEntityPayload,
  type EntityType,
} from "@/services/script_entity_service";

export const runtime = "edge";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const EMPTY_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const normalizeEntityType = (value: string): EntityType =>
  value === "truth" || value === "role" || value === "clue" || value === "flow_node"
    ? value
    : "flow_node";

const ensureOwner = async (scriptId: string, userId: string) => {
  const db = getDb();
  const rows = await db
    .select()
    .from(scripts)
    .where(and(eq(scripts.id, scriptId), eq(scripts.authorId, userId), isNull(scripts.deletedAt)))
    .limit(1);
  return rows[0];
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const script = await ensureOwner(id, user.id);
  if (!script) {
    return NextResponse.json({ message: "无权限" }, { status: 403 });
  }

  const entities = await ensureScriptEntities(id);
  const tags = await getScriptTags(id);

  return NextResponse.json({
    script: {
      id: script.id,
      title: script.title,
      summary: script.summary,
      isPublic: script.isPublic,
      allowFork: script.allowFork,
    },
    tags,
    entities,
  });
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const script = await ensureOwner(id, user.id);
  if (!script) {
    return NextResponse.json({ message: "无权限" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const scriptInput = (body?.script ?? {}) as Record<string, unknown>;
  const title = String(scriptInput.title ?? body?.title ?? "").trim();
  const summary = String(scriptInput.summary ?? body?.summary ?? "");
  const isPublic = Boolean(scriptInput.isPublic ?? body?.isPublic);
  const allowFork = Boolean(scriptInput.allowFork ?? body?.allowFork);
  const tags = String(scriptInput.tags ?? body?.tags ?? "");
  const versionNote = String(body?.versionNote ?? "").trim();
  const mode = String(body?.mode ?? "auto");

  if (!title) {
    return NextResponse.json({ message: "标题不能为空" }, { status: 400 });
  }

  const rawEntities = Array.isArray(body?.entities) ? body?.entities : [];
  const entities: ScriptEntityPayload[] = rawEntities.map((entity) => {
    const item = entity as Record<string, unknown>;
    return {
      id: String(item.id ?? crypto.randomUUID()),
      type: normalizeEntityType(String(item.type ?? "")),
      title: String(item.title ?? ""),
      content: (item.content && typeof item.content === "object") ? item.content as ScriptEntityPayload["content"] : EMPTY_DOC,
      props: (item.props && typeof item.props === "object") ? item.props as Record<string, unknown> : {},
    };
  });

  await upsertScriptEntities(id, entities);
  await updateScriptMeta({
    scriptId: id,
    title,
    summary,
    isPublic,
    allowFork,
    tags,
    userId: user.id,
    versionNote: mode === "manual" ? versionNote : "",
  });

  return NextResponse.json({ ok: true });
}
