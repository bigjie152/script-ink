import type { JSONContent } from "@tiptap/core";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clues,
  roles,
  scriptEntities,
  scriptSections,
  scriptTags,
  scriptVersions,
  scripts,
  tags,
} from "@/lib/db/schema";
import { normalizeTags } from "@/lib/utils";
import { syncScriptTags } from "@/lib/tags";

export type EntityType = "truth" | "role" | "clue" | "flow_node";

export type ScriptEntityPayload = {
  id: string;
  type: EntityType;
  title: string;
  content: JSONContent;
  props: Record<string, unknown>;
};

type ScriptEntityRow = {
  id: string;
  scriptId: string;
  type: string;
  title: string;
  contentJson: string;
  propsJson: string;
  createdAt: number;
  updatedAt: number;
};

const EMPTY_DOC: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const DEFAULT_PROPS: Record<EntityType, Record<string, unknown>> = {
  truth: { isLocked: false },
  role: { secretLevel: "medium", isMurderer: false, tags: [] },
  clue: { clueType: "物证", isHidden: false, targetId: "" },
  flow_node: { phase: "开场", durationMinutes: 15, clueIds: [] },
};

const sanitizeType = (value: string): EntityType => {
  if (value === "truth" || value === "role" || value === "clue" || value === "flow_node") {
    return value;
  }
  return "flow_node";
};

const parseJson = (value: string, fallback: JSONContent | Record<string, unknown>) => {
  try {
    return JSON.parse(value) as typeof fallback;
  } catch {
    return fallback;
  }
};

const ensureDoc = (content?: JSONContent): JSONContent => {
  if (!content || typeof content !== "object") return EMPTY_DOC;
  const normalized = { ...content };
  if (!Array.isArray(normalized.content) || normalized.content.length === 0) {
    normalized.content = [{ type: "paragraph" }];
  }
  return normalized;
};

const normalizeText = (value: string) => value.replace(/\r\n/g, "\n").trim();

const buildParagraph = (value: string): JSONContent => {
  const parts = value.split("\n");
  const content: JSONContent[] = [];
  parts.forEach((part, index) => {
    if (part) {
      content.push({ type: "text", text: part });
    }
    if (index < parts.length - 1) {
      content.push({ type: "hardBreak" });
    }
  });
  return content.length > 0 ? { type: "paragraph", content } : { type: "paragraph" };
};

const buildParagraphs = (value: string) => {
  const normalized = normalizeText(value);
  if (!normalized) return [];
  return normalized.split(/\n{2,}/).map(buildParagraph);
};

const buildHeading = (text: string): JSONContent => ({
  type: "heading",
  attrs: { level: 3 },
  content: [{ type: "text", text }],
});

const buildDocFromSections = (sections: Array<{ heading: string; text: string }>): JSONContent => {
  const content: JSONContent[] = [];
  sections.forEach((section) => {
    const normalized = normalizeText(section.text);
    if (!normalized) return;
    content.push(buildHeading(section.heading));
    content.push(...buildParagraphs(normalized));
  });

  return content.length > 0 ? { type: "doc", content } : EMPTY_DOC;
};

const toEntityRow = (scriptId: string, entity: ScriptEntityPayload, now: number) => ({
  id: entity.id,
  scriptId,
  type: entity.type,
  title: entity.title,
  contentJson: JSON.stringify(ensureDoc(entity.content)),
  propsJson: JSON.stringify(entity.props ?? {}),
  createdAt: now,
  updatedAt: now,
});

const parseEntityRow = (row: ScriptEntityRow): ScriptEntityPayload => {
  const type = sanitizeType(row.type);
  const content = ensureDoc(parseJson(row.contentJson, EMPTY_DOC) as JSONContent);
  const props = parseJson(row.propsJson, DEFAULT_PROPS[type]) as Record<string, unknown>;
  return {
    id: row.id,
    type,
    title: row.title,
    content,
    props,
  };
};

const buildDefaultEntities = (): ScriptEntityPayload[] => [
  {
    id: crypto.randomUUID(),
    type: "truth",
    title: "真相",
    content: EMPTY_DOC,
    props: { ...DEFAULT_PROPS.truth },
  },
  {
    id: crypto.randomUUID(),
    type: "flow_node",
    title: "DM 手册 / 游戏流程",
    content: EMPTY_DOC,
    props: { ...DEFAULT_PROPS.flow_node },
  },
];

const buildEntitiesFromLegacy = (
  sections: { sectionType: string; contentMd: string }[],
  roleRows: { name: string; contentMd: string; taskMd?: string | null }[],
  clueRows: { title: string; contentMd: string; triggerMd?: string | null }[]
): ScriptEntityPayload[] => {
  const dmBackground = sections.find((section) => section.sectionType === "dm_background")?.contentMd ?? "";
  const dmFlow = sections.find((section) => section.sectionType === "dm_flow")?.contentMd
    ?? sections.find((section) => section.sectionType === "dm")?.contentMd
    ?? "";
  const truth = sections.find((section) => section.sectionType === "truth")?.contentMd
    ?? sections.find((section) => section.sectionType === "outline")?.contentMd
    ?? "";

  const entities: ScriptEntityPayload[] = [];
  entities.push({
    id: crypto.randomUUID(),
    type: "truth",
    title: "真相",
    content: buildDocFromSections([{ heading: "真相", text: truth }]),
    props: { ...DEFAULT_PROPS.truth },
  });

  entities.push({
    id: crypto.randomUUID(),
    type: "flow_node",
    title: "DM 手册 / 游戏流程",
    content: buildDocFromSections([
      { heading: "背景简介", text: dmBackground },
      { heading: "游戏流程", text: dmFlow },
    ]),
    props: { ...DEFAULT_PROPS.flow_node },
  });

  roleRows.forEach((role) => {
    entities.push({
      id: crypto.randomUUID(),
      type: "role",
      title: role.name || "未命名角色",
      content: buildDocFromSections([
        { heading: "角色剧情", text: role.contentMd ?? "" },
        { heading: "角色任务", text: role.taskMd ?? "" },
      ]),
      props: { ...DEFAULT_PROPS.role },
    });
  });

  clueRows.forEach((clue) => {
    entities.push({
      id: crypto.randomUUID(),
      type: "clue",
      title: clue.title || "未命名线索",
      content: buildDocFromSections([
        { heading: "触发环节 / 条件", text: clue.triggerMd ?? "" },
        { heading: "线索内容", text: clue.contentMd ?? "" },
      ]),
      props: { ...DEFAULT_PROPS.clue },
    });
  });

  return entities;
};

export const getScriptTags = async (scriptId: string) => {
  const db = getDb();
  const rows = await db
    .select({ name: tags.name })
    .from(scriptTags)
    .innerJoin(tags, eq(tags.id, scriptTags.tagId))
    .where(eq(scriptTags.scriptId, scriptId));
  return rows.map((row) => row.name);
};

export const getScriptEntities = async (scriptId: string) => {
  const db = getDb();
  const rows = await db
    .select()
    .from(scriptEntities)
    .where(eq(scriptEntities.scriptId, scriptId))
    .orderBy(scriptEntities.createdAt);
  return rows.map(parseEntityRow);
};

export const ensureScriptEntities = async (scriptId: string) => {
  const db = getDb();
  const existing = await getScriptEntities(scriptId);
  if (existing.length > 0) {
    return existing;
  }

  const sections = await db
    .select()
    .from(scriptSections)
    .where(eq(scriptSections.scriptId, scriptId));
  const roleRows = await db
    .select()
    .from(roles)
    .where(eq(roles.scriptId, scriptId));
  const clueRows = await db
    .select()
    .from(clues)
    .where(eq(clues.scriptId, scriptId));

  const entities = buildEntitiesFromLegacy(sections, roleRows, clueRows);
  const resolved = entities.length > 0 ? entities : buildDefaultEntities();
  const now = Date.now();

  await db.transaction(async (tx) => {
    await tx.insert(scriptEntities).values(resolved.map((entity) => toEntityRow(scriptId, entity, now)));
    await tx
      .update(scripts)
      .set({ isMigrated: 1, updatedAt: now })
      .where(eq(scripts.id, scriptId));
  });

  return resolved;
};

export const upsertScriptEntities = async (scriptId: string, entities: ScriptEntityPayload[]) => {
  const db = getDb();
  const rows = await db
    .select({ id: scriptEntities.id })
    .from(scriptEntities)
    .where(eq(scriptEntities.scriptId, scriptId));
  const existingIds = new Set(rows.map((row) => row.id));
  const incomingIds = new Set(entities.map((entity) => entity.id));
  const now = Date.now();

  await db.transaction(async (tx) => {
    if (existingIds.size > 0) {
      const toDelete = Array.from(existingIds).filter((id) => !incomingIds.has(id));
      if (toDelete.length > 0) {
        await tx
          .delete(scriptEntities)
          .where(and(eq(scriptEntities.scriptId, scriptId), inArray(scriptEntities.id, toDelete)));
      }
    }

    for (const entity of entities) {
      const payload = {
        title: entity.title,
        contentJson: JSON.stringify(ensureDoc(entity.content)),
        propsJson: JSON.stringify(entity.props ?? {}),
        updatedAt: now,
      };
      if (existingIds.has(entity.id)) {
        await tx
          .update(scriptEntities)
          .set(payload)
          .where(and(eq(scriptEntities.scriptId, scriptId), eq(scriptEntities.id, entity.id)));
      } else {
        await tx.insert(scriptEntities).values({
          id: entity.id,
          scriptId,
          type: entity.type,
          createdAt: now,
          ...payload,
        });
      }
    }
  });
};

export const updateScriptMeta = async (input: {
  scriptId: string;
  title: string;
  summary?: string;
  isPublic: boolean;
  allowFork: boolean;
  tags: string;
  userId: string;
  versionNote?: string;
}) => {
  const { scriptId, title, summary, isPublic, allowFork, tags: tagInput, userId, versionNote } = input;
  const db = getDb();
  const now = Date.now();

  await db
    .update(scripts)
    .set({
      title,
      summary: summary ? summary.trim() : null,
      isPublic: isPublic ? 1 : 0,
      allowFork: allowFork ? 1 : 0,
      updatedAt: now,
    })
    .where(eq(scripts.id, scriptId));

  const normalizedTags = normalizeTags(tagInput);
  await syncScriptTags(scriptId, normalizedTags);

  if (versionNote && versionNote.trim()) {
    await db.insert(scriptVersions).values({
      id: crypto.randomUUID(),
      scriptId,
      authorId: userId,
      summary: versionNote.trim(),
      createdAt: now,
    });
  }
};

