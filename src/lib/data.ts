import { and, desc, eq, inArray, like, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import {
  clues,
  comments,
  commentLikes,
  ratings,
  roles,
  scriptFavorites,
  scriptLikes,
  scriptIssues,
  scriptMergeRequests,
  scriptSections,
  scriptTags,
  scriptVersions,
  scripts,
  tags,
  users,
} from "@/lib/db/schema";
import { computeHotScore } from "@/lib/utils";

const DEFAULT_FAVORITE_FOLDER = "默认收藏夹";

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

const buildScriptCards = async (scriptRows: {
  id: string;
  title: string;
  summary: string | null;
  coverUrl: string | null;
  rootId: string | null;
  createdAt: number;
  authorName: string | null;
  authorId: string;
  allowFork: number;
}[]) => {
  const scriptIds = scriptRows.map((row) => row.id);
  if (scriptIds.length === 0) {
    return [];
  }
  const ratingsMap = await getRatingSummaries(scriptIds);
  const rootIds = Array.from(new Set(scriptRows.map((row) => row.rootId ?? row.id)));
  const db = getDb();
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

  return scriptRows.map((script) => {
    const rating = ratingsMap.get(script.id) ?? { average: 0, count: 0, hotScore: 0 };
    return {
      ...script,
      rating,
      forkCount: forkMap.get(script.rootId ?? script.id) ?? 0,
      tags: tagMap.get(script.id) ?? [],
    };
  });
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

  const merged = await buildScriptCards(scriptRows);

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

export const getScriptCollections = async (scriptId: string, userId?: string) => {
  const db = getDb();
  const favoriteRows = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(scriptFavorites)
    .where(eq(scriptFavorites.scriptId, scriptId));
  let favorited = false;
  let favoriteFolder = DEFAULT_FAVORITE_FOLDER;
  if (userId) {
    const favoriteUserRows = await db
      .select({ folder: scriptFavorites.folder })
      .from(scriptFavorites)
      .where(and(eq(scriptFavorites.scriptId, scriptId), eq(scriptFavorites.userId, userId)))
      .limit(1);
    favorited = favoriteUserRows.length > 0;
    if (favoriteUserRows[0]?.folder) {
      favoriteFolder = favoriteUserRows[0].folder;
    }
  }
  return {
    favoriteCount: favoriteRows[0]?.count ?? 0,
    favorited,
    favoriteFolder,
  };
};

export const getScriptLikeSummary = async (scriptId: string, userId?: string) => {
  const db = getDb();
  const likeRows = await db
    .select({ count: sql<number>`count(*)`.mapWith(Number) })
    .from(scriptLikes)
    .where(eq(scriptLikes.scriptId, scriptId));
  let liked = false;
  if (userId) {
    const userRows = await db
      .select({ scriptId: scriptLikes.scriptId })
      .from(scriptLikes)
      .where(and(eq(scriptLikes.scriptId, scriptId), eq(scriptLikes.userId, userId)))
      .limit(1);
    liked = userRows.length > 0;
  }
  return { likeCount: likeRows[0]?.count ?? 0, liked };
};

export const getFavoriteFolders = async (userId: string) => {
  const db = getDb();
  const rows = await db
    .select({
      name: scriptFavorites.folder,
      count: sql<number>`count(*)`.mapWith(Number),
      latestAt: sql<number>`max(${scriptFavorites.createdAt})`.mapWith(Number),
    })
    .from(scriptFavorites)
    .where(eq(scriptFavorites.userId, userId))
    .groupBy(scriptFavorites.folder)
    .orderBy(desc(sql<number>`max(${scriptFavorites.createdAt})`.mapWith(Number)));

  const mapped = rows.map((row) => ({
    name: row.name || DEFAULT_FAVORITE_FOLDER,
    count: row.count,
    latestAt: row.latestAt,
  }));

  if (!mapped.find((row) => row.name === DEFAULT_FAVORITE_FOLDER)) {
    mapped.unshift({ name: DEFAULT_FAVORITE_FOLDER, count: 0, latestAt: 0 });
  }

  return mapped;
};

export const getFavoriteScripts = async (userId: string, folder?: string) => {
  const db = getDb();
  const resolvedFolder = folder || DEFAULT_FAVORITE_FOLDER;
  const rows = await db
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
      savedAt: scriptFavorites.createdAt,
    })
    .from(scriptFavorites)
    .innerJoin(scripts, eq(scripts.id, scriptFavorites.scriptId))
    .leftJoin(users, eq(users.id, scripts.authorId))
    .where(and(eq(scriptFavorites.userId, userId), eq(scriptFavorites.folder, resolvedFolder)))
    .orderBy(desc(scriptFavorites.createdAt));

  const merged = await buildScriptCards(rows);
  return merged.map((item, index) => ({
    ...item,
    savedAt: rows[index].savedAt,
    folder: resolvedFolder,
  }));
};

export const getLikedScripts = async (userId: string) => {
  const db = getDb();
  const rows = await db
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
      likedAt: scriptLikes.createdAt,
    })
    .from(scriptLikes)
    .innerJoin(scripts, eq(scripts.id, scriptLikes.scriptId))
    .leftJoin(users, eq(users.id, scripts.authorId))
    .where(eq(scriptLikes.userId, userId))
    .orderBy(desc(scriptLikes.createdAt));

  const merged = await buildScriptCards(rows);
  return merged.map((item, index) => ({
    ...item,
    likedAt: rows[index].likedAt,
  }));
};

export const getUserComments = async (userId: string) => {
  const db = getDb();
  const rows = await db
    .select({
      id: comments.id,
      scriptId: comments.scriptId,
      scriptTitle: scripts.title,
      content: comments.content,
      isDeleted: comments.isDeleted,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      likeCount: sql<number>`count(${commentLikes.commentId})`.mapWith(Number),
    })
    .from(comments)
    .innerJoin(scripts, eq(scripts.id, comments.scriptId))
    .leftJoin(commentLikes, eq(commentLikes.commentId, comments.id))
    .where(eq(comments.authorId, userId))
    .groupBy(comments.id)
    .orderBy(desc(comments.createdAt));

  return rows.map((row) => ({
    id: row.id,
    scriptId: row.scriptId,
    scriptTitle: row.scriptTitle,
    content: row.content,
    isDeleted: row.isDeleted === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    likeCount: row.likeCount ?? 0,
  }));
};

export const getScriptVersions = async (scriptId: string) => {
  const db = getDb();
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
    .where(eq(scriptVersions.scriptId, scriptId))
    .orderBy(desc(scriptVersions.createdAt));

  return rows.map((row) => ({
    id: row.id,
    summary: row.summary,
    createdAt: row.createdAt,
    authorId: row.authorId,
    authorName: row.authorName ?? "匿名",
  }));
};

export const getScriptIssues = async (scriptId: string) => {
  const db = getDb();
  const rows = await db
    .select({
      id: scriptIssues.id,
      type: scriptIssues.type,
      title: scriptIssues.title,
      content: scriptIssues.content,
      status: scriptIssues.status,
      createdAt: scriptIssues.createdAt,
      updatedAt: scriptIssues.updatedAt,
      authorId: scriptIssues.authorId,
      authorName: users.displayName,
    })
    .from(scriptIssues)
    .leftJoin(users, eq(users.id, scriptIssues.authorId))
    .where(eq(scriptIssues.scriptId, scriptId))
    .orderBy(desc(scriptIssues.createdAt));

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    authorId: row.authorId,
    authorName: row.authorName ?? "匿名",
  }));
};

export const getScriptLineage = async (scriptId: string) => {
  const db = getDb();
  const targetRows = await db
    .select({
      id: scripts.id,
      title: scripts.title,
      rootId: scripts.rootId,
      parentId: scripts.parentId,
      authorId: scripts.authorId,
      authorName: users.displayName,
      createdAt: scripts.createdAt,
    })
    .from(scripts)
    .leftJoin(users, eq(users.id, scripts.authorId))
    .where(eq(scripts.id, scriptId))
    .limit(1);

  const target = targetRows[0];
  if (!target) return null;
  const resolvedRootId = target.rootId ?? target.id;

  const nodes = await db
    .select({
      id: scripts.id,
      title: scripts.title,
      rootId: scripts.rootId,
      parentId: scripts.parentId,
      authorId: scripts.authorId,
      authorName: users.displayName,
      createdAt: scripts.createdAt,
    })
    .from(scripts)
    .leftJoin(users, eq(users.id, scripts.authorId))
    .where(
      or(
        eq(scripts.id, resolvedRootId),
        eq(scripts.rootId, resolvedRootId)
      )
    )
    .orderBy(scripts.createdAt);

  return {
    target,
    rootId: resolvedRootId,
    nodes: nodes.map((node) => ({
      ...node,
      authorName: node.authorName ?? "匿名",
    })),
  };
};

export const getScriptContributors = async (scriptId: string) => {
  const lineage = await getScriptLineage(scriptId);
  if (!lineage) return [];

  const counts = new Map<string, { authorId: string; authorName: string; count: number }>();
  for (const node of lineage.nodes) {
    const existing = counts.get(node.authorId) ?? {
      authorId: node.authorId,
      authorName: node.authorName ?? "匿名",
      count: 0,
    };
    existing.count += 1;
    counts.set(node.authorId, existing);
  }

  return Array.from(counts.values()).sort((a, b) => b.count - a.count);
};

export const getScriptMergeRequests = async (targetScriptId: string) => {
  const db = getDb();
  const rows = await db
    .select({
      id: scriptMergeRequests.id,
      status: scriptMergeRequests.status,
      summary: scriptMergeRequests.summary,
      createdAt: scriptMergeRequests.createdAt,
      updatedAt: scriptMergeRequests.updatedAt,
      authorId: scriptMergeRequests.authorId,
      authorName: users.displayName,
      sourceId: scriptMergeRequests.sourceScriptId,
      sourceTitle: scripts.title,
    })
    .from(scriptMergeRequests)
    .innerJoin(scripts, eq(scripts.id, scriptMergeRequests.sourceScriptId))
    .leftJoin(users, eq(users.id, scriptMergeRequests.authorId))
    .where(eq(scriptMergeRequests.targetScriptId, targetScriptId))
    .orderBy(desc(scriptMergeRequests.createdAt));

  return rows.map((row) => ({
    id: row.id,
    status: row.status,
    summary: row.summary,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    authorId: row.authorId,
    authorName: row.authorName ?? "匿名",
    sourceId: row.sourceId,
    sourceTitle: row.sourceTitle ?? "未命名剧本",
  }));
};

export const getMergeCandidates = async (userId: string, targetScriptId: string) => {
  const db = getDb();
  const targetRows = await db
    .select({ id: scripts.id, rootId: scripts.rootId })
    .from(scripts)
    .where(eq(scripts.id, targetScriptId))
    .limit(1);
  if (targetRows.length === 0) return [];

  const resolvedRootId = targetRows[0].rootId ?? targetRows[0].id;
  const rows = await db
    .select({
      id: scripts.id,
      title: scripts.title,
    })
    .from(scripts)
    .where(
      and(
        eq(scripts.authorId, userId),
        or(
          eq(scripts.rootId, resolvedRootId),
          eq(scripts.id, resolvedRootId)
        ),
        ne(scripts.id, targetScriptId)
      )
    )
    .orderBy(desc(scripts.createdAt));

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
  }));
};
