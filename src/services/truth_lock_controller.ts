import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { scriptSections } from "@/lib/db/schema";

export type TruthLock = {
  lockedAt: number;
  truth: string;
};

const parseTruthLock = (contentMd: string): TruthLock => {
  try {
    const parsed = JSON.parse(contentMd) as Partial<TruthLock>;
    return {
      lockedAt: Number(parsed.lockedAt ?? Date.now()),
      truth: String(parsed.truth ?? ""),
    };
  } catch {
    return { lockedAt: Date.now(), truth: contentMd };
  }
};

export const getTruthLock = async (scriptId: string) => {
  const db = getDb();
  const rows = await db
    .select()
    .from(scriptSections)
    .where(and(eq(scriptSections.scriptId, scriptId), eq(scriptSections.sectionType, "truth_lock")))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  return { id: row.id, ...parseTruthLock(row.contentMd) };
};

export const upsertTruthLock = async (scriptId: string, truth: string) => {
  const db = getDb();
  const payload: TruthLock = {
    lockedAt: Date.now(),
    truth,
  };
  const existing = await db
    .select()
    .from(scriptSections)
    .where(and(eq(scriptSections.scriptId, scriptId), eq(scriptSections.sectionType, "truth_lock")))
    .limit(1);

  if (existing[0]) {
    await db
      .update(scriptSections)
      .set({ contentMd: JSON.stringify(payload) })
      .where(eq(scriptSections.id, existing[0].id));
    return existing[0].id;
  }

  const id = crypto.randomUUID();
  await db.insert(scriptSections).values({
    id,
    scriptId,
    sectionType: "truth_lock",
    contentMd: JSON.stringify(payload),
  });
  return id;
};
