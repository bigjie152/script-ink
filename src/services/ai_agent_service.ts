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
    return {
      summary: "生成了质检清单（占位输出）",
      warnings: [
        "未发现明显冲突（占位）。",
        "建议补齐证据链与时间线锚点。",
      ],
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
