"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type Viewer = {
  id: string;
  displayName: string;
};

type IssueItem = {
  id: string;
  type: string;
  title: string;
  content: string;
  status: string;
  createdAt: number;
  updatedAt: number;
  authorId: string;
  authorName: string;
};

type ScriptIssuesPanelProps = {
  scriptId: string;
  scriptTitle: string;
  ownerId: string;
  viewer?: Viewer | null;
  initialIssues: IssueItem[];
};

const ISSUE_TYPES = ["逻辑冲突", "线索缺失", "DM提示", "体验反馈"];

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

export const ScriptIssuesPanel = ({
  scriptId,
  scriptTitle,
  ownerId,
  viewer,
  initialIssues,
}: ScriptIssuesPanelProps) => {
  const [issues, setIssues] = useState<IssueItem[]>(initialIssues);
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all");
  const [type, setType] = useState(ISSUE_TYPES[0]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const filteredIssues = useMemo(() => {
    if (filter === "all") return issues;
    return issues.filter((issue) => issue.status === filter);
  }, [issues, filter]);

  const reloadIssues = async () => {
    const response = await fetch(`/api/scripts/${scriptId}/issues`);
    if (!response.ok) return;
    const data = (await response.json()) as { issues?: IssueItem[] };
    setIssues(data.issues ?? []);
  };

  const handleCreate = async () => {
    if (!viewer) {
      setMessage("请先登录再提交问题单。");
      return;
    }
    const payload = {
      type,
      title: title.trim(),
      content: content.trim(),
    };
    if (!payload.title || !payload.content) {
      setMessage("标题与内容不能为空。");
      return;
    }

    setSaving(true);
    setMessage(null);
    const response = await fetch(`/api/scripts/${scriptId}/issues`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(data?.message ?? "提交失败，请稍后再试。");
      return;
    }
    setTitle("");
    setContent("");
    void reloadIssues();
  };

  const handleStatusChange = async (issueId: string, nextStatus: "open" | "closed") => {
    const response = await fetch(`/api/issues/${issueId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(data?.message ?? "更新失败，请稍后再试。");
      return;
    }
    setIssues((prev) =>
      prev.map((issue) => (issue.id === issueId ? { ...issue, status: nextStatus } : issue))
    );
  };

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-500">问题单面板</p>
          <h1 className="font-display text-2xl text-ink-900">{scriptTitle}</h1>
        </div>
        <Link href={`/scripts/${scriptId}`} className="text-sm text-ink-600 hover:text-ink-900">
          返回剧本页
        </Link>
      </div>

      <Card className="grid gap-4">
        <p className="text-sm text-ink-600">把反馈写成结构化问题，避免评论区混战。</p>
        <div className="grid gap-3 md:grid-cols-[160px,1fr]">
          <Select value={type} onChange={(event) => setType(event.target.value)}>
            {ISSUE_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="一句话描述问题标题"
          />
        </div>
        <Textarea
          rows={4}
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="补充细节：例如第 3 幕线索无法自洽..."
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleCreate} disabled={saving}>
            {saving ? "提交中..." : "提交问题单"}
          </Button>
          {!viewer && <span className="text-xs text-ink-500">登录后可提交。</span>}
          {message && <span className="text-xs text-ink-600">{message}</span>}
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        {(["all", "open", "closed"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`rounded-full px-4 py-2 font-semibold transition ${
              filter === item
                ? "bg-ink-900 text-paper-50"
                : "border border-ink-200 text-ink-700 hover:border-ink-500"
            }`}
          >
            {item === "all" ? "全部" : item === "open" ? "待处理" : "已关闭"}
          </button>
        ))}
      </div>

      {filteredIssues.length === 0 ? (
        <Card className="border-dashed border-ink-200 bg-paper-50/80 text-center text-sm text-ink-500">
          暂无问题单。
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredIssues.map((issue) => {
            const canManage = viewer?.id === issue.authorId || viewer?.id === ownerId;
            return (
              <Card key={issue.id} className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                    <Badge>{issue.type}</Badge>
                    <span>{issue.status === "open" ? "待处理" : "已关闭"}</span>
                    <span>{formatDate(issue.createdAt)}</span>
                  </div>
                  {canManage && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {issue.status === "open" ? (
                        <Button
                          variant="outline"
                          onClick={() => handleStatusChange(issue.id, "closed")}
                        >
                          标记已解决
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => handleStatusChange(issue.id, "open")}
                        >
                          重新打开
                        </Button>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-display text-lg text-ink-900">{issue.title}</p>
                  <p className="mt-2 text-sm text-ink-600">{issue.content}</p>
                </div>
                <div className="text-xs text-ink-500">
                  提交者：{issue.authorName}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};
