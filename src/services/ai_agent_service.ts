export type AiScope = "dm" | "roles" | "clues" | "truth" | "global";
export type AiAction = "generate" | "improve" | "audit" | "director";
export type AiMode = "light" | "standard" | "creative";

export type AiGenre =
  | "none"
  | "detective"
  | "story"
  | "emotion"
  | "horror"
  | "mechanism"
  | "comedy";

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

export type DirectorIdea = {
  id: string;
  title: string;
  logline: string;
  truth: string;
  dmBackground: string;
  dmFlow: string;
  roles: RoleDraft[];
  clues: ClueDraft[];
  tags: string[];
};

export type AiResult = {
  summary: string;
  warnings: string[];
  changes: AiChange[];
  ideas?: DirectorIdea[];
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

const buildDirectorIdeas = (context: AiContextPool): DirectorIdea[] => {
  const seeds = [
    {
      id: "seed-1",
      title: "遗失的家族遗产",
      logline: "一封遗嘱与一场失踪，将家族旧案重新推回众人面前。",
      tags: ["家族", "遗产", "失踪"],
    },
    {
      id: "seed-2",
      title: "寒夜孤馆",
      logline: "大雪封山的旅馆里，一夜之间的变故引发连环疑云。",
      tags: ["密闭", "旅馆", "暴风雪"],
    },
    {
      id: "seed-3",
      title: "双重身份",
      logline: "所有人都在隐藏真实身份，真相藏在彼此的秘密交叉点。",
      tags: ["身份", "谎言", "反转"],
    },
  ];

  return seeds.map((seed) => ({
    id: seed.id,
    title: seed.title,
    logline: seed.logline,
    truth: `【真相骨架】\n- 凶手：\n- 动机：\n- 手法：\n- 时间线：\n- 证据链：\n\n提示：请围绕「${seed.title}」完善闭环。`,
    dmBackground: `【背景简介】\n- 场景：${seed.title}\n- 核心冲突：${seed.logline}`,
    dmFlow: "【流程】开场 -> 搜证 -> 讨论 -> 投票 -> 复盘",
    roles: [
      { name: "角色A", contentMd: "角色视角剧情（占位）。", taskMd: "角色任务（占位）。" },
      { name: "角色B", contentMd: "角色视角剧情（占位）。", taskMd: "角色任务（占位）。" },
      { name: "角色C", contentMd: "角色视角剧情（占位）。", taskMd: "角色任务（占位）。" },
    ],
    clues: [
      { title: "线索一", triggerMd: "触发条件（占位）。", contentMd: "线索内容（占位）。" },
      { title: "线索二", triggerMd: "触发条件（占位）。", contentMd: "线索内容（占位）。" },
    ],
    tags: context.tags.length > 0 ? context.tags : seed.tags,
  }));
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

const sanitizeAiText = (value: string) => value
  .replace(/<br\s*\/?>/gi, "\n")
  .replace(/<\/?[^>]+>/g, "")
  .replace(/\r\n/g, "\n")
  .replace(/\n{3,}/g, "\n\n")
  .trim();

const extractJsonPayload = (value: string) => {
  const start = value.indexOf("[");
  const end = value.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return value;
  return value.slice(start, end + 1);
};

const parseRolesFromText = (value: string): RoleDraft[] => {
  const blocks = value.split(/\n(?=#\s)/).map((block) => block.trim()).filter(Boolean);
  if (blocks.length === 0) {
    return [{ name: "AI 角色", contentMd: value.trim(), taskMd: "" }];
  }
  return blocks.map((block) => {
    const lines = block.split(/\r?\n/);
    const heading = lines[0].replace(/^#+\s*/, "").trim() || "未命名角色";
    const rest = lines.slice(1).join("\n").trim();
    const taskHeadingIndex = rest.search(/(^|\n)##\s*(个人任务|角色任务)/);
    if (taskHeadingIndex >= 0) {
      return {
        name: heading,
        contentMd: rest.slice(0, taskHeadingIndex).trim(),
        taskMd: rest.slice(taskHeadingIndex).trim(),
      };
    }
    const taskIndex = rest.search(/(角色任务|任务)/);
    if (taskIndex >= 0) {
      return {
        name: heading,
        contentMd: rest.slice(0, taskIndex).trim(),
        taskMd: rest.slice(taskIndex).trim(),
      };
    }
    return {
      name: heading,
      contentMd: rest,
      taskMd: "",
    };
  });
};

const parseCluesFromText = (value: string): ClueDraft[] => {
  const lines = value.split(/\r?\n/);
  const blocks: string[][] = [];
  let current: string[] = [];

  const pushCurrent = () => {
    if (current.length === 0) return;
    blocks.push(current);
    current = [];
  };

  for (const line of lines) {
    if (/^\s*[-*\s]*线索名称[:：]/.test(line)) {
      pushCurrent();
      current.push(line);
      continue;
    }
    if (current.length > 0) {
      current.push(line);
    }
  }
  pushCurrent();

  const normalizeRow = (row: string) => {
    const rawCells = row.split("|").map((cell) => cell.trim());
    const start = rawCells[0] === "" ? 1 : 0;
    const end = rawCells[rawCells.length - 1] === "" ? rawCells.length - 1 : rawCells.length;
    return rawCells.slice(start, end);
  };

  const parseTable = () => {
    const tableLines = lines.map((line) => line.trim()).filter(Boolean);
    const headerIndex = tableLines.findIndex(
      (line) => line.includes("|") && line.includes("线索名称")
    );
    if (headerIndex === -1) return [] as ClueDraft[];
    const headerCells = normalizeRow(tableLines[headerIndex]);
    if (headerCells.length === 0) return [] as ClueDraft[];

    let rowStart = headerIndex + 1;
    if (tableLines[rowStart]?.replace(/\|/g, "").trim().match(/^-+$/)) {
      rowStart += 1;
    }

    const results: ClueDraft[] = [];
    for (let i = rowStart; i < tableLines.length; i += 1) {
      const row = tableLines[i];
      if (!row.includes("|")) break;
      const cells = normalizeRow(row);
      if (cells.length === 0) continue;
      const cellMap = new Map<string, string>();
      headerCells.forEach((header, idx) => {
        cellMap.set(header, cells[idx] ?? "");
      });
      const title = cellMap.get("线索名称") ?? cells[0] ?? "";
      const trigger = cellMap.get("投放阶段")
        ?? cellMap.get("触发条件")
        ?? "";
      const contentParts = [
        cellMap.get("玩家可见内容"),
        cellMap.get("DM 解读"),
      ].filter((part) => part && part.trim().length > 0) as string[];
      const content = contentParts.length > 0 ? contentParts.join("\n") : cells.join(" | ");
      results.push({
        title: title || `线索 ${results.length + 1}`,
        triggerMd: trigger,
        contentMd: content.trim(),
      });
    }
    return results;
  };

  if (blocks.length === 0) {
    const tableClues = parseTable();
    if (tableClues.length > 0) return tableClues;
    return [{ title: "AI 线索", contentMd: value.trim(), triggerMd: "" }];
  }

  return blocks.map((block, index) => {
    const titleLine = block[0]?.replace(/^\s*[-*\s]*线索名称[:：]\s*/, "") ?? "";
    const triggerLine = block.find((line) => line.includes("投放阶段") || line.includes("触发")) ?? "";
    return {
      title: titleLine || `线索 ${index + 1}`,
      triggerMd: triggerLine.trim(),
      contentMd: block.join("\n").trim(),
    };
  });
};

const splitDmContent = (value: string) => {
  const lines = value.split(/\r?\n/);
  const backgroundLines: string[] = [];
  const flowLines: string[] = [];
  let mode: "background" | "flow" | "unknown" = "unknown";

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (/^(#+|\[|【).*(背景|世界观)/.test(trimmed)) {
      mode = "background";
    }
    if (/^(#+|\[|【).*(流程|轮次|总览|节奏|Beat Map)/.test(trimmed)) {
      mode = "flow";
    }

    if (mode === "background") {
      backgroundLines.push(line);
    } else if (mode === "flow") {
      flowLines.push(line);
    } else {
      backgroundLines.push(line);
    }
  });

  return {
    background: backgroundLines.join("\n").trim(),
    flow: flowLines.join("\n").trim(),
  };
};

const extractWarnings = (value: string) => {
  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const candidates = lines.filter((line) => line.startsWith("-") || line.startsWith("•") || line.startsWith("⚠") || line.startsWith("❌"));
  return (candidates.length > 0 ? candidates : lines).slice(0, 8).map((line) => line.replace(/^[-•\s]*/, ""));
};

export const buildResultFromText = ({
  scope,
  action,
  text,
}: {
  scope: AiScope;
  action: AiAction;
  text: string;
}): AiResult => {
  const cleaned = sanitizeAiText(text);

  if (action === "director") {
    try {
      const payload = extractJsonPayload(cleaned);
      const ideas = JSON.parse(payload) as DirectorIdea[];
      return {
        summary: "导演模式生成完成。",
        warnings: [],
        changes: [],
        ideas,
      };
    } catch {
      return {
        summary: "导演模式返回了不可解析的内容。",
        warnings: ["请确认模型输出为 JSON 数组格式。"],
        changes: [],
      };
    }
  }

  if (action === "audit") {
    return {
      summary: "AI 质检已完成。",
      warnings: extractWarnings(cleaned),
      changes: [],
    };
  }

  if (scope === "truth") {
    return {
      summary: "AI 已生成真相内容。",
      warnings: [],
      changes: [{ target: "truth", action: "replace", value: cleaned }],
    };
  }

  if (scope === "dm") {
    const split = splitDmContent(cleaned);
    return {
      summary: "AI 已生成 DM 内容。",
      warnings: [],
      changes: [
        { target: "dmBackground", action: "replace", value: split.background || cleaned },
        { target: "dmFlow", action: "replace", value: split.flow || cleaned },
      ],
    };
  }

  if (scope === "roles") {
    return {
      summary: "AI 已生成角色内容。",
      warnings: [],
      changes: [{ target: "roles", action: "replace", value: parseRolesFromText(cleaned) }],
    };
  }

  if (scope === "clues") {
    return {
      summary: "AI 已生成线索内容。",
      warnings: [],
      changes: [{ target: "clues", action: "replace", value: parseCluesFromText(cleaned) }],
    };
  }

  return {
    summary: "AI 已返回内容。",
    warnings: [],
    changes: [],
  };
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
  if (action === "director") {
    const warnings: string[] = [];
    const hasExisting =
      normalizeList(current?.dmBackground ?? context.dmBackground).length > 0 ||
      normalizeList(current?.dmFlow ?? context.dmFlow).length > 0 ||
      normalizeList(current?.truth ?? context.truth).length > 0 ||
      (current?.roles ?? context.roles).some((role) => normalizeList(role.contentMd).length > 0) ||
      (current?.clues ?? context.clues).some((clue) => normalizeList(clue.contentMd).length > 0);

    if (hasExisting) {
      warnings.push("当前已有内容，应用梗概会覆盖对应板块内容。");
    }

    return {
      summary: "生成了 3 个梗概卡片，选择一个初始化四大板块。",
      warnings,
      changes: [],
      ideas: buildDirectorIdeas(context),
    };
  }
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
  const modeLabel = mode === "creative" ? "创意" : mode === "standard" ? "标准" : "轻量";

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
