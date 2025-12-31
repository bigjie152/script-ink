import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { scriptEntities } from "@/lib/db/schema";

export type TruthLock = {
  lockedAt: number;
  truth: string;
};

const parseTruthLock = (raw: string): TruthLock => {
  try {
    const parsed = JSON.parse(raw) as Partial<TruthLock>;
    return {
      lockedAt: Number(parsed.lockedAt ?? Date.now()),
      truth: String(parsed.truth ?? ""),
    };
  } catch {
    return { lockedAt: Date.now(), truth: raw };
  }
};

const parseTruthLockFromProps = (propsJson: string): TruthLock | null => {
  try {
    const parsed = JSON.parse(propsJson) as { truthLock?: TruthLock };
    if (parsed?.truthLock?.truth) {
      return {
        lockedAt: Number(parsed.truthLock.lockedAt ?? Date.now()),
        truth: String(parsed.truthLock.truth ?? ""),
      };
    }
  } catch {
    return null;
  }
  return null;
};

const buildTruthDoc = (truth: string) => ({
  type: "doc",
  content: [
    {
      type: "paragraph",
      content: truth ? [{ type: "text", text: truth }] : [],
    },
  ],
});

export const getTruthLock = async (scriptId: string) => {
  const db = getDb();
  const rows = await db
    .select()
    .from(scriptEntities)
    .where(and(eq(scriptEntities.scriptId, scriptId), eq(scriptEntities.type, "truth")))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  const props = row.propsJson ? parseTruthLockFromProps(row.propsJson) : null;
  if (props?.truth) {
    return { id: row.id, ...props };
  }
  return { id: row.id, ...parseTruthLock(row.contentJson) };
};

export const upsertTruthLock = async (scriptId: string, truth: string) => {
  const db = getDb();
  const payload: TruthLock = {
    lockedAt: Date.now(),
    truth,
  };
  const existing = await db
    .select()
    .from(scriptEntities)
    .where(and(eq(scriptEntities.scriptId, scriptId), eq(scriptEntities.type, "truth")))
    .limit(1);

  if (existing[0]) {
    await db
      .update(scriptEntities)
      .set({
        contentJson: JSON.stringify(buildTruthDoc(truth)),
        propsJson: JSON.stringify({ isLocked: true, truthLock: payload }),
        updatedAt: Date.now(),
      })
      .where(eq(scriptEntities.id, existing[0].id));
    return existing[0].id;
  }

  const id = crypto.randomUUID();
  await db.insert(scriptEntities).values({
    id,
    scriptId,
    type: "truth",
    title: "真相",
    contentJson: JSON.stringify(buildTruthDoc(truth)),
    propsJson: JSON.stringify({ isLocked: true, truthLock: payload }),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return id;
};
