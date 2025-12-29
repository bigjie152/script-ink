"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";

type Viewer = {
  id: string;
  displayName: string;
};

type MergeRequestItem = {
  id: string;
  status: string;
  summary: string;
  createdAt: number;
  updatedAt: number;
  authorId: string;
  authorName: string;
  sourceId: string;
  sourceTitle: string;
};

type MergeCandidate = {
  id: string;
  title: string;
};

type ScriptMergePanelProps = {
  scriptId: string;
  scriptTitle: string;
  viewer?: Viewer | null;
  isOwner: boolean;
  initialRequests: MergeRequestItem[];
  candidates: MergeCandidate[];
};

const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

export const ScriptMergePanel = ({
  scriptId,
  scriptTitle,
  viewer,
  isOwner,
  initialRequests,
  candidates,
}: ScriptMergePanelProps) => {
  const [requests, setRequests] = useState(initialRequests);
  const [sourceId, setSourceId] = useState(candidates[0]?.id ?? "");
  const [summary, setSummary] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reloadRequests = async () => {
    const response = await fetch(`/api/scripts/${scriptId}/merge-requests`);
    if (!response.ok) return;
    const data = (await response.json()) as { requests?: MergeRequestItem[] };
    setRequests(data.requests ?? []);
  };

  const handleCreate = async () => {
    if (!viewer) {
      setMessage("请先登录再提交合并申请。");
      return;
    }
    if (!sourceId || !summary.trim()) {
      setMessage("请选择改编作品并填写说明。");
      return;
    }

    setSaving(true);
    setMessage(null);
    const response = await fetch(`/api/scripts/${scriptId}/merge-requests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, summary }),
    });
    setSaving(false);
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(data?.message ?? "提交失败，请稍后再试。");
      return;
    }
    setSummary("");
    void reloadRequests();
  };

  const handleStatus = async (id: string, status: "accepted" | "rejected") => {
    const response = await fetch(`/api/merge-requests/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(data?.message ?? "更新失败，请稍后再试。");
      return;
    }
    setRequests((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status } : item))
    );
  };

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-500">改编合并</p>
          <h1 className="font-display text-2xl text-ink-900">{scriptTitle}</h1>
        </div>
        <Link href={`/scripts/${scriptId}`} className="text-sm text-ink-600 hover:text-ink-900">
          返回剧本页
        </Link>
      </div>

      {!isOwner && (
        <Card className="grid gap-4">
          <p className="text-sm text-ink-600">提交你的改编版本，向原作者发起合并申请。</p>
          {viewer ? (
            <>
              {candidates.length === 0 ? (
                <p className="text-sm text-ink-500">没有可提交的改编作品。</p>
              ) : (
                <>
                  <Select value={sourceId} onChange={(event) => setSourceId(event.target.value)}>
                    {candidates.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </Select>
                  <Textarea
                    rows={3}
                    value={summary}
                    onChange={(event) => setSummary(event.target.value)}
                    placeholder="说明改编的核心变化、你希望合并的内容。"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    <Button onClick={handleCreate} disabled={saving}>
                      {saving ? "提交中..." : "提交合并申请"}
                    </Button>
                    {message && <span className="text-xs text-ink-600">{message}</span>}
                  </div>
                </>
              )}
            </>
          ) : (
            <p className="text-sm text-ink-500">登录后可提交合并申请。</p>
          )}
        </Card>
      )}

      {requests.length === 0 ? (
        <Card className="border-dashed border-ink-200 bg-paper-50/80 text-center text-sm text-ink-500">
          暂无合并申请。
        </Card>
      ) : (
        <div className="grid gap-4">
          {requests.map((request) => (
            <Card key={request.id} className="grid gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                  <Badge>{request.status === "pending" ? "待处理" : request.status === "accepted" ? "已采纳" : "已拒绝"}</Badge>
                  <span>{formatDate(request.createdAt)}</span>
                  <span>来自：{request.authorName}</span>
                </div>
                {isOwner && request.status === "pending" && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <Button variant="outline" onClick={() => handleStatus(request.id, "accepted")}>
                      采纳
                    </Button>
                    <Button variant="outline" onClick={() => handleStatus(request.id, "rejected")}>
                      拒绝
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <Link href={`/scripts/${request.sourceId}`} className="font-display text-lg text-ink-900">
                  {request.sourceTitle}
                </Link>
                <p className="mt-2 text-sm text-ink-600">{request.summary}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
      {message && <span className="text-xs text-ink-600">{message}</span>}
    </section>
  );
};
