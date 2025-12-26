import { eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { scriptTags, tags } from "@/lib/db/schema";

export const syncScriptTags = async (scriptId: string, tagNames: string[]) => {
  const db = getDb();
  const normalized = Array.from(new Set(tagNames));

  if (normalized.length === 0) {
    await db.delete(scriptTags).where(eq(scriptTags.scriptId, scriptId));
    return [];
  }

  const existing = await db
    .select()
    .from(tags)
    .where(inArray(tags.name, normalized));

  const existingMap = new Map(existing.map((tag) => [tag.name, tag.id]));
  const toInsert = normalized.filter((name) => !existingMap.has(name));

  if (toInsert.length > 0) {
    const insertRows = toInsert.map((name) => ({ id: crypto.randomUUID(), name }));
    await db.insert(tags).values(insertRows);
    insertRows.forEach((tag) => existingMap.set(tag.name, tag.id));
  }

  await db.delete(scriptTags).where(eq(scriptTags.scriptId, scriptId));
  await db.insert(scriptTags).values(
    normalized.map((name) => ({
      scriptId,
      tagId: existingMap.get(name)!,
    }))
  );

  return normalized;
};
