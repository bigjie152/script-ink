export type AiScope = "dm" | "roles" | "clues" | "truth" | "global";
export type AiAction = "generate" | "improve" | "audit";
export type AiMode = "light" | "standard";

export type RoleDraft = {
  name: string;
  contentMd: string;
  taskMd?: string;
};

export type ClueDraft = {
  title: string;
  contentMd: string;
  triggerMd?: string;
};

export type AiContextPool = {
  truthLock: string;
  truth: string;
  dmBackground: string;
  dmFlow: string;
  roles: RoleDraft[];
  clues: ClueDraft[];
  tags: string[];
};

export type AiChange = {
  target: "dmBackground" | "dmFlow" | "truth" | "roles" | "clues";
  action: "replace" | "append";
  value: unknown;
};

export type AiResult = {
  summary: string;
  warnings: string[];
  changes: AiChange[];
};

export const getSectorRules = (scope: AiScope) => {
  const rules: Record<AiScope, string[]> = {
    global: [
      "保持真相骨架一致，不要引入冲突。",
      "避免提前泄露最终凶手或关键证据。",
    ],
    truth: [
      "真相必须包含动机、手法、机会、证据链。",
      "时间线需自洽且可被线索验证。",
    ],
    dm: [
      "流程需可执行，提示要分梯度。",
      "复盘时按证据链顺序收束。",
    ],
    roles: [
      "角色知道的内容必须与真相一致。",
      "避免某一角色信息量过大导致锁凶过早。",
    ],
    clues: [
      "线索需绑定事件或角色。",
      "线索投放节奏先误导后收束。",
    ],
  };

  return rules[scope];
};

const appendText = (base: string, extra: string) =>
  base.trim().length === 0 ? extra : `${base.trim()}\n\n${extra}`;

const normalizeList = (value: string | undefined | null) => (value ?? "").trim();

const hasKeyword = (value: string, keywords: string[]) =>
  keywords.some((keyword) => value.toLowerCase().includes(keyword.toLowerCase()));

const findDuplicates = (items: string[]) => {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  items.forEach((item) => {
    const normalized = item.trim();
    if (!normalized) return;
    if (seen.has(normalized)) {
      duplicates.add(normalized);
    } else {
      seen.add(normalized);
    }
  });
  return Array.from(duplicates);
};

const buildAuditWarnings = (
  context: AiContextPool,
  current?: {
    dmBackground?: string;
    dmFlow?: string;
    truth?: string;
    roles?: RoleDraft[];
    clues?: ClueDraft[];
  }
) => {
  const warnings: string[] = [];
  const dmBackground = normalizeList(current?.dmBackground ?? context.dmBackground);
  const dmFlow = normalizeList(current?.dmFlow ?? context.dmFlow);
  const truth = normalizeList(current?.truth ?? context.truth);
  const roles = current?.roles ?? context.roles;
  const clues = current?.clues ?? context.clues;

  if (!truth) {
    warnings.push("真相为空，无法完成闭环校验。");
  }

  if (!context.truthLock.trim()) {
    warnings.push("真相未锁定，建议先锁定真相骨架。");
  } else if (truth && context.truthLock.trim() !== truth.trim()) {
    warnings.push("真相已锁定，但当前内容与锁定版本不一致。");
  }

  if (!dmBackground) warnings.push("DM 背景为空，建议补充世界观与背景信息。");
  if (!dmFlow) warnings.push("DM 流程为空，建议补充完整流程。");

  if (!roles.length) {
    warnings.push("角色剧本为空，建议至少创建 1 个角色。");
  } else {
    const emptyNames = roles.filter((role) => !normalizeList(role.name)).length;
    const emptyContent = roles.filter((role) => !normalizeList(role.contentMd)).length;
    const emptyTasks = roles.filter((role) => !normalizeList(role.taskMd ?? "")).length;
    const duplicateNames = findDuplicates(roles.map((role) => role.name));

    if (emptyNames > 0) warnings.push(`存在 ${emptyNames} 个未命名角色。`);
    if (emptyContent > 0) warnings.push(`存在 ${emptyContent} 个角色剧情为空。`);
    if (emptyTasks > 0) warnings.push(`存在 ${emptyTasks} 个角色任务为空。`);
    if (duplicateNames.length > 0) warnings.push(`角色名称重复：${duplicateNames.join("、")}`);
  }

  if (!clues.length) {
    warnings.push("线索库为空，建议至少创建 1 条线索。");
  } else {
    const emptyTitles = clues.filter((clue) => !normalizeList(clue.title)).length;
    const emptyContent = clues.filter((clue) => !normalizeList(clue.contentMd)).length;
    const emptyTriggers = clues.filter((clue) => !normalizeList(clue.triggerMd ?? "")).length;
    const duplicateTitles = findDuplicates(clues.map((clue) => clue.title));

    if (emptyTitles > 0) warnings.push(`存在 ${emptyTitles} 条未命名线索。`);
    if (emptyContent > 0) warnings.push(`存在 ${emptyContent} 条线索内容为空。`);
    if (emptyTriggers > 0) warnings.push(`存在 ${emptyTriggers} 条线索触发条件为空。`);
    if (duplicateTitles.length > 0) warnings.push(`线索名称重复：${duplicateTitles.join("、")}`);
  }

  if (truth) {
    const missingFields: string[] = [];
    if (!hasKeyword(truth, ["动机", "motive"])) missingFields.push("动机");
    if (!hasKeyword(truth, ["手法", "手段", "method"])) missingFields.push("手法");
    if (!hasKeyword(truth, ["时间", "时间线", "timeline"])) missingFields.push("时间线");
    if (!hasKeyword(truth, ["证据", "线索", "evidence", "clue"])) missingFields.push("证据链");
    if (missingFields.length > 0) {
      warnings.push(`真相要素可能不完整：缺少 ${missingFields.join("、")}`);
    }
  }

  return warnings;
};

export const buildMockResult = ({
  scope,
  action,
  mode,
  context,
  current,
}: {
  scope: AiScope;
  action: AiAction;
  mode: AiMode;
  context: AiContextPool;
  current?: {
    dmBackground?: string;
    dmFlow?: string;
    truth?: string;
    roles?: RoleDraft[];
    clues?: ClueDraft[];
  };
}): AiResult => {
  if (action === "audit") {
    const warnings = buildAuditWarnings(context, current);
    return {
      summary: warnings.length > 0
        ? `发现 ${warnings.length} 项需要关注的内容。`
        : "未发现明显问题。",
      warnings,
      changes: [],
    };
  }

  const changes: AiChange[] = [];
  const modeLabel = mode === "standard" ? "标准" : "轻量";

  if (scope === "truth") {
    const nextTruth = action === "generate"
      ? "【AI占位】真相骨架\n- 凶手：\n- 动机：\n- 手法：\n- 时间线：\n- 证据链："
      : appendText(current?.truth ?? context.truth, `【AI${modeLabel}优化占位】补充动机与证据链。`);
    changes.push({ target: "truth", action: "replace", value: nextTruth });
  }

  if (scope === "dm") {
    const nextBackground = action === "generate"
      ? "【AI占位】补全世界观与背景冲突。"
      : appendText(current?.dmBackground ?? context.dmBackground, `【AI${modeLabel}优化占位】补充背景细节。`);
    const nextFlow = action === "generate"
      ? "【AI占位】流程：开场 -> 搜证 -> 讨论 -> 投票 -> 复盘。"
      : appendText(current?.dmFlow ?? context.dmFlow, `【AI${modeLabel}优化占位】补充提示梯度。`);
    changes.push({ target: "dmBackground", action: "replace", value: nextBackground });
    changes.push({ target: "dmFlow", action: "replace", value: nextFlow });
  }

  if (scope === "roles") {
    if (action === "generate") {
      changes.push({
        target: "roles",
        action: "append",
        value: [
          {
            name: "新角色（占位）",
            contentMd: "【AI占位】角色视角剧情。",
            taskMd: "【AI占位】角色任务。",
          },
        ],
      });
    } else {
      const updated = (current?.roles ?? context.roles).map((role) => ({
        ...role,
        contentMd: appendText(role.contentMd, `【AI${modeLabel}优化占位】补充视角细节。`),
      }));
      changes.push({ target: "roles", action: "replace", value: updated });
    }
  }

  if (scope === "clues") {
    if (action === "generate") {
      changes.push({
        target: "clues",
        action: "append",
        value: [
          {
            title: "新线索（占位）",
            triggerMd: "【AI占位】触发条件。",
            contentMd: "【AI占位】线索内容。",
          },
        ],
      });
    } else {
      const updated = (current?.clues ?? context.clues).map((clue) => ({
        ...clue,
        contentMd: appendText(clue.contentMd, `【AI${modeLabel}优化占位】补充线索细节。`),
      }));
      changes.push({ target: "clues", action: "replace", value: updated });
    }
  }

  return {
    summary: `已生成 ${scope} 的 ${action} 结果（占位输出）`,
    warnings: context.truthLock.trim().length === 0
      ? ["真相尚未锁定，建议先完成真相骨架。"]
      : [],
    changes,
  };
};
