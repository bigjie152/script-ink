import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getScriptDetail } from "@/lib/data";
import {
  buildMockResult,
  buildResultFromText,
  getSectorRules,
  type AiAction,
  type AiMode,
  type AiScope,
  type RoleDraft,
  type ClueDraft,
} from "@/services/ai_agent_service";
import { getAiConfig, requestDeepSeek } from "@/services/ai_client";
import { getSystemPrompt } from "@/services/ai_prompt_templates";
import { getTruthLock } from "@/services/truth_lock_controller";

export const runtime = "edge";

type AiRequestBody = {
  scriptId?: string;
  scope?: AiScope;
  action?: AiAction;
  mode?: AiMode;
  instruction?: string;
  current?: {
    dmBackground?: string;
    dmFlow?: string;
    truth?: string;
    roles?: RoleDraft[];
    clues?: ClueDraft[];
  };
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ message: "请先登录。" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as AiRequestBody | null;
  const scriptId = body?.scriptId?.trim() ?? "";
  const action = body?.action ?? "generate";
  const scope = action === "director" ? "global" : (body?.scope ?? "global");
  const mode = body?.mode ?? "light";
  const instruction = body?.instruction ?? "";

  if (!scriptId) {
    return NextResponse.json({ message: "缺少 scriptId。" }, { status: 400 });
  }

  const detail = await getScriptDetail(scriptId);
  if (!detail) {
    return NextResponse.json({ message: "剧本不存在。" }, { status: 404 });
  }
  if (detail.script.authorId !== user.id) {
    return NextResponse.json({ message: "无权限操作该剧本。" }, { status: 403 });
  }

  const truthLockRow = await getTruthLock(scriptId);
  const truthLock = truthLockRow?.truth ?? "";
  const dmBackground = detail.sections.find((section) => section.sectionType === "dm_background")?.contentMd ?? "";
  const dmFlow = detail.sections.find((section) => section.sectionType === "dm_flow")?.contentMd
    ?? detail.sections.find((section) => section.sectionType === "dm")?.contentMd
    ?? "";
  const truth = detail.sections.find((section) => section.sectionType === "truth")?.contentMd
    ?? detail.sections.find((section) => section.sectionType === "outline")?.contentMd
    ?? "";

  const contextPool = {
    truthLock,
    truth,
    dmBackground,
    dmFlow,
    roles: detail.roles.map((role) => ({
      name: role.name,
      contentMd: role.contentMd,
      taskMd: role.taskMd ?? "",
    })),
    clues: detail.clues.map((clue) => ({
      title: clue.title,
      contentMd: clue.contentMd,
      triggerMd: clue.triggerMd ?? "",
    })),
    tags: detail.tags,
  };

  const systemPrompt = getSystemPrompt({ scope, action });
  const contextMessage = `【GLOBAL_CANONICAL_STATE】
${JSON.stringify({
  truth_lock: contextPool.truthLock || undefined,
  entities: {
    roles: contextPool.roles.map((role) => role.name),
    clues: contextPool.clues.map((clue) => clue.title),
    tags: contextPool.tags,
  },
}, null, 2)}

【当前板块已有内容】
${body?.current
  ? JSON.stringify(body.current, null, 2)
  : JSON.stringify({ scope, dmBackground, dmFlow, truth }, null, 2)}

【用户希望输出到哪里】
- 板块：${scope}
- 操作：${action}
`;

  const aiConfig = getAiConfig();
  let result;
  let aiText = "";
  let aiSource = "mock";
  let aiError = "";
  if (aiConfig) {
    try {
      aiText = await requestDeepSeek(aiConfig, [
        { role: "system", content: systemPrompt },
        { role: "user", content: contextMessage },
        { role: "user", content: instruction || "（无额外指令）" },
      ]);
      if (!aiText.trim()) {
        result = buildMockResult({
          scope,
          action,
          mode,
          context: contextPool,
          current: body?.current,
        });
      } else {
        result = buildResultFromText({ scope, action, text: aiText });
        aiSource = "deepseek";
      }
    } catch (error) {
      aiError = error instanceof Error ? error.message : "DeepSeek 调用失败";
      result = buildMockResult({
        scope,
        action,
        mode,
        context: contextPool,
        current: body?.current,
      });
    }
  } else {
    result = buildMockResult({
      scope,
      action,
      mode,
      context: contextPool,
      current: body?.current,
    });
  }

  return NextResponse.json({
    ok: true,
    result,
    context: {
      Global_Context: contextPool,
      Sector_Specific_Rules: getSectorRules(scope),
      User_Instruction: instruction,
    },
    systemPrompt,
    aiText,
    aiSource,
    aiError,
  });
}
