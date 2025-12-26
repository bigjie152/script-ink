import { NextResponse } from "next/server";

export const runtime = "edge";

export async function POST() {
  return NextResponse.json(
    { message: "AI 接口尚未配置，请在 .env 中设置 Provider。" },
    { status: 501 }
  );
}
