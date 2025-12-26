import { NextResponse } from "next/server";
import { getCommunityScripts } from "@/lib/data";

export const runtime = "edge";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sortParam = url.searchParams.get("sort");
  const sort = sortParam === "hot" ? "hot" : "latest";
  const scripts = await getCommunityScripts(sort);
  return NextResponse.json({ scripts });
}
