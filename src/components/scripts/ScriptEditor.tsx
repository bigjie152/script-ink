"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";

const tabs = [
  { id: "dm", label: "DM 手册 / 游戏流程" },
  { id: "roles", label: "角色剧本" },
  { id: "clues", label: "线索库" },
  { id: "truth", label: "真相" },
] as const;

type TabId = (typeof tabs)[number]["id"];

type AiAction = "generate" | "improve" | "audit" | "director";
type AiMode = "light" | "standard";
type AiChange = {
  target: "dmBackground" | "dmFlow" | "truth" | "roles" | "clues";
  action: "replace" | "append";
  value: unknown;
};
type DirectorIdea = {
  id: string;
  title: string;
  logline: string;
  truth: string;
  dmBackground: string;
  dmFlow: string;
  roles: { name: string; contentMd: string; taskMd?: string }[];
  clues: { title: string; contentMd: string; triggerMd?: string }[];
  tags: string[];
};
type AiResult = {
  summary: string;
  warnings: string[];
  changes: AiChange[];
  ideas?: DirectorIdea[];
};

type ScriptEditorProps = {
  script: {
    id: string;
    title: string;
    summary: string | null;
    isPublic: number;
    allowFork: number;
  };
  sections: { id: string; sectionType: string; contentMd: string }[];
  roles: { id: string; name: string; contentMd: string; taskMd?: string | null }[];
  clues: { id: string; title: string; contentMd: string; triggerMd?: string | null }[];
  tags: string[];
};

export const ScriptEditor = ({ script, sections, roles, clues, tags }: ScriptEditorProps) => {
  const [activeTab, setActiveTab] = useState<TabId>("dm");
  const dmBackgroundSection = sections.find((section) => section.sectionType === "dm_background");
  const dmFlowSection = sections.find((section) => section.sectionType === "dm_flow");
  const legacyDmSection = sections.find((section) => section.sectionType === "dm");
  const truthSection = sections.find((section) => section.sectionType === "truth")
    ?? sections.find((section) => section.sectionType === "outline");
  const [title, setTitle] = useState(script.title);
  const [summary, setSummary] = useState(script.summary ?? "");
  const [versionNote, setVersionNote] = useState("");
  const [isPublic, setIsPublic] = useState(script.isPublic === 1);
  const [allowFork, setAllowFork] = useState(script.allowFork === 1);
  const [dmBackground, setDmBackground] = useState(dmBackgroundSection?.contentMd ?? "");
  const [dmFlow, setDmFlow] = useState(dmFlowSection?.contentMd ?? legacyDmSection?.contentMd ?? "");
  const [truth, setTruth] = useState(truthSection?.contentMd ?? "");
  const [roleItems, setRoleItems] = useState(
    roles.map((role) => ({
      ...role,
      taskMd: role.taskMd ?? "",
    }))
  );
  const [clueItems, setClueItems] = useState(
    clues.map((clue) => ({
      ...clue,
      triggerMd: clue.triggerMd ?? "",
    }))
  );
  const [tagInput, setTagInput] = useState(tags.map((tag) => `#${tag}`).join(" "));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [aiAction, setAiAction] = useState<AiAction>("generate");
  const [aiMode, setAiMode] = useState<AiMode>("light");
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiResult, setAiResult] = useState<AiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiStreamText, setAiStreamText] = useState("");
  const [aiStreamEnabled, setAiStreamEnabled] = useState(true);
  const [aiSelected, setAiSelected] = useState<number[]>([]);
  const [truthLocked, setTruthLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState<string | null>(null);

  const addRole = () => {
    setRoleItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", contentMd: "", taskMd: "" },
    ]);
  };

  const addClue = () => {
    setClueItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: "", triggerMd: "", contentMd: "" },
    ]);
  };

  const updateRole = (index: number, patch: Partial<(typeof roleItems)[number]>) => {
    setRoleItems((prev) =>
      prev.map((role, idx) => (idx === index ? { ...role, ...patch } : role))
    );
  };

  const updateClue = (index: number, patch: Partial<(typeof clueItems)[number]>) => {
    setClueItems((prev) =>
      prev.map((clue, idx) => (idx === index ? { ...clue, ...patch } : clue))
    );
  };

  const removeRole = (index: number) => {
    setRoleItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const removeClue = (index: number) => {
    setClueItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const canSave = useMemo(() => title.trim().length > 0, [title]);
  const activeTabLabel = tabs.find((tab) => tab.id === activeTab)?.label ?? "";

  useEffect(() => {
    const loadTruthLock = async () => {
      const response = await fetch(`/api/scripts/${script.id}/truth-lock`);
      if (!response.ok) return;
      const data = (await response.json()) as { locked?: boolean };
      setTruthLocked(Boolean(data.locked));
    };

    void loadTruthLock();
  }, [script.id]);

  useEffect(() => {
    if (!aiResult?.changes) {
      setAiSelected([]);
      return;
    }
    setAiSelected(aiResult.changes.map((_, index) => index));
  }, [aiResult]);

  const handleTruthLock = async () => {
    setLockMessage(null);
    const response = await fetch(`/api/scripts/${script.id}/truth-lock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ truth }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setLockMessage(data?.message ?? "真相锁定失败。");
      return;
    }

    setTruthLocked(true);
    setLockMessage("真相已锁定");
  };

  const applyAiChanges = (changes: AiChange[]) => {
    const applyText = (current: string, action: "replace" | "append", value: string) => {
      if (action === "replace") return value;
      return current.trim().length === 0 ? value : `${current.trim()}\n\n${value}`;
    };

    changes.forEach((change) => {
      if (change.target === "dmBackground") {
        setDmBackground((prev) => applyText(prev, change.action, String(change.value ?? "")));
      }
      if (change.target === "dmFlow") {
        setDmFlow((prev) => applyText(prev, change.action, String(change.value ?? "")));
      }
      if (change.target === "truth") {
        setTruth((prev) => applyText(prev, change.action, String(change.value ?? "")));
      }
      if (change.target === "roles") {
        const nextRoles = (Array.isArray(change.value) ? change.value : []) as Array<{ id?: string; name: string; contentMd: string; taskMd?: string }>;
        const normalized = nextRoles.map((role) => ({
          id: role.id ?? crypto.randomUUID(),
          name: role.name ?? "",
          contentMd: role.contentMd ?? "",
          taskMd: role.taskMd ?? "",
        }));
        if (change.action === "replace") {
          setRoleItems(normalized);
        } else {
          setRoleItems((prev) => [...prev, ...normalized]);
        }
      }
      if (change.target === "clues") {
        const nextClues = (Array.isArray(change.value) ? change.value : []) as Array<{ id?: string; title: string; contentMd: string; triggerMd?: string }>;
        const normalized = nextClues.map((clue) => ({
          id: clue.id ?? crypto.randomUUID(),
          title: clue.title ?? "",
          contentMd: clue.contentMd ?? "",
          triggerMd: clue.triggerMd ?? "",
        }));
        if (change.action === "replace") {
          setClueItems(normalized);
        } else {
          setClueItems((prev) => [...prev, ...normalized]);
        }
      }
    });

    setAiResult(null);
    setAiMessage("已应用 AI 改动");
  };

  const applySelectedChanges = () => {
    if (!aiResult) return;
    const selected = aiResult.changes.filter((_, index) => aiSelected.includes(index));
    if (selected.length === 0) {
      setAiMessage("请先选择需要应用的改动。");
      return;
    }
    applyAiChanges(selected);
  };

  const getCurrentText = (target: AiChange["target"]) => {
    if (target === "dmBackground") return dmBackground;
    if (target === "dmFlow") return dmFlow;
    if (target === "truth") return truth;
    return "";
  };

  const applyTextPreview = (current: string, change: AiChange) => {
    if (change.action === "replace") return String(change.value ?? "");
    return current.trim().length === 0
      ? String(change.value ?? "")
      : `${current.trim()}\n\n${String(change.value ?? "")}`;
  };

  const getPatchLabel = (item: unknown, target: AiChange["target"]) => {
    if (item && typeof item === "object") {
      const candidate = item as { name?: string; title?: string };
      if (target === "roles" && candidate.name) return candidate.name;
      if (target === "clues" && candidate.title) return candidate.title;
    }
    return target === "roles" ? "未命名角色" : "未命名线索";
  };

  const toggleSelected = (index: number) => {
    setAiSelected((prev) =>
      prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]
    );
  };

  const selectedCount = aiSelected.length;

  const applyDirectorIdea = (idea: DirectorIdea) => {
    if (!title.trim()) setTitle(idea.title);
    if (!summary.trim()) setSummary(idea.logline);
    if (idea.tags.length > 0) {
      setTagInput(idea.tags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" "));
    }
    setDmBackground(idea.dmBackground);
    setDmFlow(idea.dmFlow);
    setTruth(idea.truth);
    setRoleItems(
      idea.roles.map((role) => ({
        id: crypto.randomUUID(),
        name: role.name ?? "",
        contentMd: role.contentMd ?? "",
        taskMd: role.taskMd ?? "",
      }))
    );
    setClueItems(
      idea.clues.map((clue) => ({
        id: crypto.randomUUID(),
        title: clue.title ?? "",
        contentMd: clue.contentMd ?? "",
        triggerMd: clue.triggerMd ?? "",
      }))
    );
    setAiResult(null);
    setAiMessage("已应用梗概初始化内容");
  };

  const parseSseEvent = (raw: string) => {
    const lines = raw.split(/\r?\n/);
    let event = "message";
    let data = "";
    lines.forEach((line) => {
      if (line.startsWith("event:")) {
        event = line.replace("event:", "").trim();
      }
      if (line.startsWith("data:")) {
        data += line.replace("data:", "").trim();
      }
    });
    return { event, data };
  };

  const runAiStream = async (payload: Record<string, unknown>) => {
    setAiStreaming(true);
    setAiStreamText("");

    const response = await fetch("/api/ai?stream=1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok || !response.body) {
      setAiMessage("AI 流式输出失败，请稍后重试。");
      setAiLoading(false);
      setAiStreaming(false);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";

      for (const part of parts) {
        const { event, data } = parseSseEvent(part);
        if (!data) continue;
        if (event === "chunk") {
          try {
            const payload = JSON.parse(data) as { chunk?: string };
            if (payload.chunk) {
              setAiStreamText((prev) => prev + payload.chunk);
            }
          } catch {
            // ignore malformed chunk
          }
        }
        if (event === "done") {
          try {
            const payload = JSON.parse(data) as { result?: AiResult; aiSource?: string; aiError?: string };
            setAiResult(payload.result ?? null);
            if (payload.aiError) {
              setAiMessage(payload.aiError);
            } else if (payload.aiSource) {
              setAiMessage(`来源：${payload.aiSource === "deepseek" ? "DeepSeek" : "占位"}`);
            }
          } catch {
            setAiMessage("AI 输出解析失败。");
          }
        }
        if (event === "error") {
          try {
            const payload = JSON.parse(data) as { message?: string };
            setAiMessage(payload.message ?? "AI 调用失败。");
          } catch {
            setAiMessage("AI 调用失败。");
          }
        }
      }
    }

    setAiLoading(false);
    setAiStreaming(false);
  };

  const runAi = async () => {
    setAiLoading(true);
    setAiMessage(null);
    setAiResult(null);
    setAiStreamText("");

    const scope = aiAction === "director" ? "global" : activeTab;
    const payload = {
      scriptId: script.id,
      scope,
      action: aiAction,
      mode: aiMode,
      instruction: aiInstruction,
      current: {
        dmBackground,
        dmFlow,
        truth,
        roles: roleItems.map((role) => ({
          name: role.name,
          contentMd: role.contentMd,
          taskMd: role.taskMd ?? "",
        })),
        clues: clueItems.map((clue) => ({
          title: clue.title,
          contentMd: clue.contentMd,
          triggerMd: clue.triggerMd ?? "",
        })),
      },
    };

    if (aiStreamEnabled) {
      await runAiStream(payload);
      return;
    }

    const response = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setAiMessage(data?.message ?? "AI 执行失败，请稍后重试。");
      setAiLoading(false);
      return;
    }

    const data = (await response.json()) as { result?: AiResult };
    setAiResult(data.result ?? null);
    setAiLoading(false);
  };

  const handleSave = async () => {
    if (!canSave) {
      setMessage("请先填写剧本标题。");
      return;
    }

    setSaving(true);
    setMessage(null);

    const payload = {
      title: title.trim(),
      summary: summary.trim(),
      isPublic,
      allowFork,
      tags: tagInput,
      versionNote: versionNote.trim(),
      sections: {
        dmBackground,
        dmFlow,
        truth,
      },
      roles: roleItems,
      clues: clueItems,
    };

    const response = await fetch(`/api/scripts/${script.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setSaving(false);
    if (!response.ok) {
      setMessage("保存失败，请稍后再试。");
      return;
    }

    setMessage("已保存");
    setVersionNote("");
  };

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 rounded-3xl border border-ink-100 bg-white/80 p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold text-ink-600">剧本标题</label>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink-600">标签话题</label>
            <Input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              placeholder="#古风 #密室 #高智商"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-600">剧本简介</label>
          <Textarea
            rows={3}
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            placeholder="用 2-3 句话描述核心故事和推理亮点。"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-ink-600">更新说明（可选）</label>
          <Input
            value={versionNote}
            onChange={(event) => setVersionNote(event.target.value)}
            placeholder="例如：补充第 3 幕反转、优化线索动机"
          />
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-ink-600">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(event) => setIsPublic(event.target.checked)}
            />
            公开发布（社区可见）
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowFork}
              onChange={(event) => setAllowFork(event.target.checked)}
            />
            允许改编
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
          <Button variant="outline" type="button" onClick={() => window.location.href = `/scripts/${script.id}/preview`}>
            发布前预览
          </Button>
          {message && <span className="text-xs text-ink-600">{message}</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-ink-900 text-paper-50"
                : "border border-ink-200 text-ink-700 hover:border-ink-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "dm" && (
        <div className="rounded-3xl border border-ink-100 bg-white/80 p-6">
          <p className="text-xs text-ink-500">先交代背景，再写清游戏流程和关键节点。</p>
          <div className="mt-4 grid gap-4">
            <div>
              <label className="text-xs font-semibold text-ink-600">背景简介</label>
              <Textarea
                rows={8}
                value={dmBackground}
                onChange={(event) => setDmBackground(event.target.value)}
                placeholder="世界观与事件背景、时间线、重要人物关系等。"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-600">游戏流程</label>
              <Textarea
                rows={10}
                value={dmFlow}
                onChange={(event) => setDmFlow(event.target.value)}
                placeholder="开场、搜证、讨论、投票、复盘流程。"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === "roles" && (
        <div className="grid gap-4">
          <h3 className="font-display text-lg text-ink-900">角色剧本</h3>
          {roleItems.length === 0 ? (
            <p className="text-sm text-ink-500">还没有角色，先添加一个吧。</p>
          ) : (
            roleItems.map((role, index) => (
              <div key={role.id} className="rounded-3xl border border-ink-100 bg-white/80 p-6">
                <div className="flex items-center justify-between gap-3">
                  <Input
                    value={role.name}
                    onChange={(event) => updateRole(index, { name: event.target.value })}
                    placeholder="角色名称"
                    className="max-w-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeRole(index)}
                    className="text-xs text-ink-500 hover:text-ink-800"
                  >
                    删除
                  </button>
                </div>
                <div className="mt-4 grid gap-3">
                  <div>
                    <label className="text-xs font-semibold text-ink-600">角色剧情</label>
                    <Textarea
                      rows={8}
                      value={role.contentMd}
                      onChange={(event) => updateRole(index, { contentMd: event.target.value })}
                      placeholder="第一人称剧本内容"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-ink-600">角色任务</label>
                    <Textarea
                      rows={5}
                      value={role.taskMd ?? ""}
                      onChange={(event) => updateRole(index, { taskMd: event.target.value })}
                      placeholder="角色要完成的目标与行动指引"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
          <button
            type="button"
            onClick={addRole}
            className="flex items-center justify-center rounded-3xl border border-dashed border-ink-200 bg-paper-50/80 py-4 text-sm font-semibold text-ink-700 hover:border-ink-400"
          >
            ＋ 新增角色
          </button>
        </div>
      )}

      {activeTab === "clues" && (
        <div className="grid gap-4">
          <h3 className="font-display text-lg text-ink-900">线索库</h3>
          {clueItems.length === 0 ? (
            <p className="text-sm text-ink-500">还没有线索，先添加一条吧。</p>
          ) : (
            clueItems.map((clue, index) => (
              <div key={clue.id} className="rounded-3xl border border-ink-100 bg-white/80 p-6">
                <div className="flex items-center justify-between gap-3">
                  <Input
                    value={clue.title}
                    onChange={(event) => updateClue(index, { title: event.target.value })}
                    placeholder="线索标题"
                    className="max-w-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeClue(index)}
                    className="text-xs text-ink-500 hover:text-ink-800"
                  >
                    删除
                  </button>
                </div>
                <div className="mt-4 grid gap-3">
                  <div>
                    <label className="text-xs font-semibold text-ink-600">触发环节 / 条件</label>
                    <Textarea
                      rows={4}
                      value={clue.triggerMd ?? ""}
                      onChange={(event) => updateClue(index, { triggerMd: event.target.value })}
                      placeholder="例如：完成搜证环节后、角色对话触发"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-ink-600">线索内容</label>
                    <Textarea
                      rows={6}
                      value={clue.contentMd}
                      onChange={(event) => updateClue(index, { contentMd: event.target.value })}
                      placeholder="线索描述"
                    />
                  </div>
                </div>
              </div>
            ))
          )}
          <button
            type="button"
            onClick={addClue}
            className="flex items-center justify-center rounded-3xl border border-dashed border-ink-200 bg-paper-50/80 py-4 text-sm font-semibold text-ink-700 hover:border-ink-400"
          >
            ＋ 新增线索
          </button>
        </div>
      )}

      {activeTab === "truth" && (
        <div className="rounded-3xl border border-ink-100 bg-white/80 p-6">
          <p className="text-xs text-ink-500">在这里完整写下故事真相与动机。</p>
          <Textarea
            rows={14}
            value={truth}
            onChange={(event) => setTruth(event.target.value)}
            placeholder="写明凶手动机、作案过程、关键误导点与最终揭示。"
          />
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-ink-600">
            <Button variant="outline" type="button" onClick={handleTruthLock}>
              锁定真相
            </Button>
            <span>状态：{truthLocked ? "已锁定" : "未锁定"}</span>
            {lockMessage && <span className="text-ink-500">{lockMessage}</span>}
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-ink-100 bg-paper-50/80 p-6">
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-lg text-ink-900">AI 助手</h3>
              <p className="mt-2 text-sm text-ink-600">
                统一接口已就绪，当前为占位输出，提示词后续补充。
              </p>
            </div>
            <Badge>当前板块：{activeTabLabel}</Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs text-ink-600">
              操作类型
              <Select value={aiAction} onChange={(event) => setAiAction(event.target.value as AiAction)}>
                <option value="generate">生成</option>
                <option value="improve">改写/补全</option>
                <option value="audit">质检</option>
                <option value="director">导演模式</option>
              </Select>
            </label>
            <label className="text-xs text-ink-600">
              运行模式
              <Select value={aiMode} onChange={(event) => setAiMode(event.target.value as AiMode)}>
                <option value="light">轻量</option>
                <option value="standard">标准</option>
              </Select>
            </label>
            <label className="text-xs text-ink-600">
              指令补充
              <Input
                value={aiInstruction}
                onChange={(event) => setAiInstruction(event.target.value)}
                placeholder="如：强调诡计、控制字数等"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs text-ink-600">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={aiStreamEnabled}
                onChange={(event) => setAiStreamEnabled(event.target.checked)}
              />
              流式显示（生成中可预览）
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={runAi} disabled={aiLoading}>
              {aiLoading ? "执行中..." : "执行 AI"}
            </Button>
            {aiMessage && <span className="text-xs text-ink-600">{aiMessage}</span>}
          </div>

          {aiStreaming && (
            <div className="grid gap-2 rounded-2xl border border-ink-100 bg-white/80 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-500">实时生成中</p>
              <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-ink-700">
                {aiStreamText || "模型正在生成，请稍候..."}
              </pre>
            </div>
          )}

          {aiResult && (
            <div className="grid gap-3 rounded-2xl border border-ink-100 bg-paper-50/80 p-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-ink-500">AI 输出摘要</p>
                <p className="mt-2 text-sm text-ink-700">{aiResult.summary}</p>
              </div>
              {aiResult.warnings.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-500">提示</p>
                  <ul className="mt-2 list-disc pl-4 text-xs text-ink-600">
                    {aiResult.warnings.map((warning, index) => (
                      <li key={`${warning}-${index}`}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
              {aiResult.ideas && aiResult.ideas.length > 0 && (
                <div className="grid gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-500">梗概卡片</p>
                  <div className="grid gap-3 md:grid-cols-3">
                    {aiResult.ideas.map((idea) => (
                      <div key={idea.id} className="rounded-2xl border border-ink-100 bg-white/80 p-4 shadow-sm">
                        <h4 className="text-sm font-semibold text-ink-900">{idea.title}</h4>
                        <p className="mt-2 text-xs text-ink-600">{idea.logline}</p>
                        {idea.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-ink-500">
                            {idea.tags.map((tag) => (
                              <span key={`${idea.id}-${tag}`} className="rounded-full border border-ink-100 px-2 py-1">
                                {tag.startsWith("#") ? tag : `#${tag}`}
                              </span>
                            ))}
                          </div>
                        )}
                        <Button type="button" className="mt-3 w-full" onClick={() => applyDirectorIdea(idea)}>
                          使用该梗概
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {aiResult.changes.length > 0 && (
                <div className="grid gap-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-ink-500">补丁清单</p>
                    <span className="text-xs text-ink-500">
                      已选择 {selectedCount} / {aiResult.changes.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={() => setAiSelected(aiResult.changes.map((_, index) => index))}>
                      全选
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setAiSelected([])}>
                      全不选
                    </Button>
                  </div>
                  <div className="grid gap-3">
                    {aiResult.changes.map((change, index) => {
                      const isSelected = aiSelected.includes(index);
                      const targetLabel = change.target === "dmBackground"
                        ? "DM 背景"
                        : change.target === "dmFlow"
                          ? "DM 流程"
                          : change.target === "truth"
                            ? "真相"
                            : change.target === "roles"
                              ? "角色剧本"
                              : "线索库";

                      const isTextTarget = ["dmBackground", "dmFlow", "truth"].includes(change.target);
                      const currentText = isTextTarget ? getCurrentText(change.target) : "";
                      const nextText = isTextTarget ? applyTextPreview(currentText, change) : "";
                      const listItems = Array.isArray(change.value) ? change.value : [];

                      return (
                        <div key={`${change.target}-${index}`} className="rounded-2xl border border-ink-100 bg-white/80 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <label className="flex items-center gap-2 text-xs font-semibold text-ink-700">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelected(index)}
                              />
                              {targetLabel} · {change.action === "replace" ? "替换" : "追加"}
                            </label>
                            <span className="text-xs text-ink-500">补丁 #{index + 1}</span>
                          </div>
                          {isTextTarget && (
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                              <div className="rounded-xl border border-ink-100 bg-paper-50/80 p-3">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-ink-500">原内容</p>
                                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-ink-600">
                                  {currentText || "（空）"}
                                </pre>
                              </div>
                              <div className="rounded-xl border border-ink-100 bg-emerald-50/80 p-3">
                                <p className="text-[10px] uppercase tracking-[0.2em] text-emerald-600">建议内容</p>
                                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs text-emerald-800">
                                  {nextText || "（空）"}
                                </pre>
                              </div>
                            </div>
                          )}
                          {!isTextTarget && (
                            <div className="mt-3 rounded-xl border border-ink-100 bg-paper-50/80 p-3">
                              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-500">
                                {change.action === "replace" ? "替换为" : "追加"} {listItems.length} 条
                              </p>
                              {listItems.length > 0 ? (
                                <ul className="mt-2 grid gap-1 text-xs text-ink-600">
                                  {listItems.slice(0, 5).map((item, itemIndex: number) => (
                                    <li key={`${change.target}-${index}-${itemIndex}`}>
                                      {getPatchLabel(item, change.target)}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="mt-2 text-xs text-ink-500">（空）</p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={applySelectedChanges}>
                      应用改动
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setAiResult(null)}>
                      放弃
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
