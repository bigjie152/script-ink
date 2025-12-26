import { and, eq, inArray, like, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clues,
  ratings,
  roles,
  scriptSections,
  scriptTags,
  scripts,
  tags,
  users,
} from "@/lib/db/schema";
import { computeHotScore } from "@/lib/utils";

export type RatingSummary = {
  scriptId: string;
  average: number;
  count: number;
  hotScore: number;
};

const mapRatingRows = (rows: { scriptId: string; average: number | null; count: number }[]) => {
  const summary = new Map<string, RatingSummary>();
  for (const row of rows) {
    const average = row.average ?? 0;
    summary.set(row.scriptId, {
      scriptId: row.scriptId,
      average,
      count: row.count,
      hotScore: computeHotScore(average, row.count),
    });
  }
  return summary;
};

export const getRatingSummaries = async (scriptIds: string[]) => {
  if (scriptIds.length === 0) return new Map<string, RatingSummary>();
  const db = getDb();
  const rows = await db
    .select({
      scriptId: ratings.scriptId,
      average: sql<number>`avg((${ratings.logicScore} + ${ratings.proseScore} + ${ratings.trickScore}) / 3.0)`
        .mapWith(Number),
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(ratings)
    .where(inArray(ratings.scriptId, scriptIds))
    .groupBy(ratings.scriptId);

  return mapRatingRows(rows);
};

export const getScriptDetail = async (scriptId: string) => {
  const db = getDb();
  const scriptRows = await db
    .select({
      id: scripts.id,
      authorId: scripts.authorId,
      title: scripts.title,
      summary: scripts.summary,
      coverUrl: scripts.coverUrl,
      isPublic: scripts.isPublic,
      allowFork: scripts.allowFork,
      rootId: scripts.rootId,
      parentId: scripts.parentId,
      createdAt: scripts.createdAt,
      updatedAt: scripts.updatedAt,
      authorName: users.displayName,
    })
    .from(scripts)
    .leftJoin(users, eq(users.id, scripts.authorId))
    .where(eq(scripts.id, scriptId))
    .limit(1);

  const script = scriptRows[0];
  if (!script) return null;

  const sectionRows = await db
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

  const tagRows = await db
    .select({ name: tags.name })
    .from(scriptTags)
    .innerJoin(tags, eq(tags.id, scriptTags.tagId))
    .where(eq(scriptTags.scriptId, scriptId));

  const ratingSummary = await getRatingSummaries([scriptId]);

  return {
    script,
    sections: sectionRows,
    roles: roleRows,
    clues: clueRows,
    tags: tagRows.map((tag) => tag.name),
    rating: ratingSummary.get(scriptId) ?? { scriptId, average: 0, count: 0, hotScore: 0 },
  };
};

type CommunityFilters = {
  sort: "latest" | "hot";
  query?: string;
  tag?: string;
};

export const getCommunityScripts = async ({ sort, query, tag }: CommunityFilters) => {
  const db = getDb();
  let tagScriptIds: string[] | null = null;
  if (tag) {
    const tagRows = await db
      .select({ scriptId: scriptTags.scriptId })
      .from(scriptTags)
      .innerJoin(tags, eq(tags.id, scriptTags.tagId))
      .where(eq(tags.name, tag));
    tagScriptIds = tagRows.map((row) => row.scriptId);
    if (tagScriptIds.length === 0) {
      return [];
    }
  }

  const conditions = [eq(scripts.isPublic, 1)];
  if (query) {
    const keywordFilter = or(
      like(scripts.title, `%${query}%`),
      like(scripts.summary, `%${query}%`)
    );
    if (keywordFilter) {
      conditions.push(keywordFilter);
    }
  }
  if (tagScriptIds) {
    conditions.push(inArray(scripts.id, tagScriptIds));
  }

  const scriptRows = await db
    .select({
      id: scripts.id,
      title: scripts.title,
      summary: scripts.summary,
      coverUrl: scripts.coverUrl,
      rootId: scripts.rootId,
      createdAt: scripts.createdAt,
      authorName: users.displayName,
      authorId: scripts.authorId,
      allowFork: scripts.allowFork,
    })
    .from(scripts)
    .leftJoin(users, eq(users.id, scripts.authorId))
    .where(and(...conditions));

  const scriptIds = scriptRows.map((row) => row.id);
  if (scriptIds.length === 0) {
    return [];
  }
  const ratingsMap = await getRatingSummaries(scriptIds);
  const rootIds = Array.from(
    new Set(scriptRows.map((row) => row.rootId ?? row.id))
  );
  const forkRows = await db
    .select({
      rootId: scripts.rootId,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(scripts)
    .where(inArray(scripts.rootId, rootIds))
    .groupBy(scripts.rootId);

  const forkMap = new Map<string, number>();
  for (const row of forkRows) {
    if (!row.rootId) continue;
    forkMap.set(row.rootId, Math.max(0, row.count - 1));
  }

  const tagRows = await db
    .select({ scriptId: scriptTags.scriptId, name: tags.name })
    .from(scriptTags)
    .innerJoin(tags, eq(tags.id, scriptTags.tagId))
    .where(inArray(scriptTags.scriptId, scriptIds));

  const tagMap = new Map<string, string[]>();
  for (const row of tagRows) {
    const existing = tagMap.get(row.scriptId) ?? [];
    existing.push(row.name);
    tagMap.set(row.scriptId, existing);
  }

  const merged = scriptRows.map((script) => {
    const rating = ratingsMap.get(script.id) ?? { average: 0, count: 0, hotScore: 0 };
    return {
      ...script,
      rating,
      forkCount: forkMap.get(script.rootId ?? script.id) ?? 0,
      tags: tagMap.get(script.id) ?? [],
    };
  });

  if (sort === "hot") {
    return merged.sort((a, b) => b.rating.hotScore - a.rating.hotScore);
  }

  return merged.sort((a, b) => b.createdAt - a.createdAt);
};

export const getScriptForkChain = async (scriptId: string) => {
  const db = getDb();
  const rows = await db
    .select({
      id: scripts.id,
      title: scripts.title,
      authorId: scripts.authorId,
      authorName: users.displayName,
    })
    .from(scripts)
    .leftJoin(users, eq(users.id, scripts.authorId))
    .where(eq(scripts.id, scriptId));

  return rows[0] ?? null;
};

export const getAuthorScripts = async (authorId: string) => {
  const db = getDb();
  return db
    .select()
    .from(scripts)
    .where(eq(scripts.authorId, authorId));
};
