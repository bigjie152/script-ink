import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { scriptSections, scripts } from "@/lib/db/schema";
import { normalizeTags } from "@/lib/utils";
import { syncScriptTags } from "@/lib/tags";

export const runtime = "edge";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const title = String(body?.title ?? "").trim();
  const summary = String(body?.summary ?? "").trim();
  const tagInput = String(body?.tags ?? "");
  const isPublic = Boolean(body?.isPublic);
  const allowFork = Boolean(body?.allowFork);

  if (!title) {
    return NextResponse.json({ message: "请填写标题" }, { status: 400 });
  }

  const now = Date.now();
  const scriptId = crypto.randomUUID();
  const db = getDb();

  await db.insert(scripts).values({
    id: scriptId,
    authorId: user.id,
    title,
    summary: summary || null,
    coverUrl: null,
    isPublic: isPublic ? 1 : 0,
    allowFork: allowFork ? 1 : 0,
    rootId: scriptId,
    parentId: null,
    createdAt: now,
    updatedAt: now,
  });

  await db.insert(scriptSections).values([
    {
      id: crypto.randomUUID(),
      scriptId,
      sectionType: "outline",
      contentMd: "",
    },
    {
      id: crypto.randomUUID(),
      scriptId,
      sectionType: "dm",
      contentMd: "",
    },
  ]);

  const tags = normalizeTags(tagInput);
  await syncScriptTags(scriptId, tags);

  return NextResponse.json({ id: scriptId });
}
