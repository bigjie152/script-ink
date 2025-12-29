"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";

const tabs = [
  { id: "outline", label: "故事大纲" },
  { id: "roles", label: "人物剧本" },
  { id: "clues", label: "线索库" },
  { id: "dm", label: "DM 手册" },
] as const;

type TabId = (typeof tabs)[number]["id"];

type ScriptEditorProps = {
  script: {
    id: string;
    title: string;
    summary: string | null;
    isPublic: number;
    allowFork: number;
  };
  sections: { id: string; sectionType: string; contentMd: string }[];
  roles: { id: string; name: string; contentMd: string }[];
  clues: { id: string; title: string; contentMd: string }[];
  tags: string[];
};

export const ScriptEditor = ({ script, sections, roles, clues, tags }: ScriptEditorProps) => {
  const [activeTab, setActiveTab] = useState<TabId>("outline");
  const outlineSection = sections.find((section) => section.sectionType === "outline");
  const dmSection = sections.find((section) => section.sectionType === "dm");
  const [title, setTitle] = useState(script.title);
  const [summary, setSummary] = useState(script.summary ?? "");
  const [versionNote, setVersionNote] = useState("");
  const [isPublic, setIsPublic] = useState(script.isPublic === 1);
  const [allowFork, setAllowFork] = useState(script.allowFork === 1);
  const [outline, setOutline] = useState(outlineSection?.contentMd ?? "");
  const [dm, setDm] = useState(dmSection?.contentMd ?? "");
  const [roleItems, setRoleItems] = useState(roles);
  const [clueItems, setClueItems] = useState(clues);
  const [tagInput, setTagInput] = useState(tags.map((tag) => `#${tag}`).join(" "));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const addRole = () => {
    setRoleItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: "", contentMd: "" },
    ]);
  };

  const addClue = () => {
    setClueItems((prev) => [
      ...prev,
      { id: crypto.randomUUID(), title: "", contentMd: "" },
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
        outline,
        dm,
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

      {activeTab === "outline" && (
        <div className="rounded-3xl border border-ink-100 bg-white/80 p-6">
          <p className="text-xs text-ink-500">支持 Markdown，建议描述故事主线与关键反转。</p>
          <Textarea
            rows={16}
            value={outline}
            onChange={(event) => setOutline(event.target.value)}
            placeholder="从案发到真相，写下主要剧情线索。"
          />
        </div>
      )}

      {activeTab === "dm" && (
        <div className="rounded-3xl border border-ink-100 bg-white/80 p-6">
          <p className="text-xs text-ink-500">记录主持人需要掌握的流程、节奏和隐藏信息。</p>
          <Textarea
            rows={16}
            value={dm}
            onChange={(event) => setDm(event.target.value)}
            placeholder="主持人提示、关键节奏、玩家引导等。"
          />
        </div>
      )}

      {activeTab === "roles" && (
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg text-ink-900">角色剧本</h3>
            <Button variant="outline" type="button" onClick={addRole}>
              添加角色
            </Button>
          </div>
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
                <Textarea
                  rows={10}
                  value={role.contentMd}
                  onChange={(event) => updateRole(index, { contentMd: event.target.value })}
                  placeholder="第一人称剧本内容"
                />
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === "clues" && (
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg text-ink-900">线索库</h3>
            <Button variant="outline" type="button" onClick={addClue}>
              添加线索
            </Button>
          </div>
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
                <Textarea
                  rows={8}
                  value={clue.contentMd}
                  onChange={(event) => updateClue(index, { contentMd: event.target.value })}
                  placeholder="线索描述"
                />
              </div>
            ))
          )}
        </div>
      )}

      <div className="rounded-3xl border border-ink-100 bg-paper-50/80 p-6">
        <div className="flex items-start justify-between gap-6">
          <div>
            <h3 className="font-display text-lg text-ink-900">AI 助手（占位）</h3>
            <p className="mt-2 text-sm text-ink-600">
              已预留 API 接口，后续可接入不同厂商模型。
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge>润色与扩写</Badge>
              <Badge>线索提炼</Badge>
              <Badge>诡计推荐</Badge>
            </div>
          </div>
          <Button variant="outline" type="button" onClick={() => alert("AI 接口尚未配置")}>试用</Button>
        </div>
      </div>
    </div>
  );
};
