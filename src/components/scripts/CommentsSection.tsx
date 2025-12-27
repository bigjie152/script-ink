"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";

type Viewer = {
  id: string;
  displayName: string;
};

type CommentItem = {
  id: string;
  parentId: string | null;
  scriptId: string;
  authorId: string;
  authorName: string;
  content: string;
  isDeleted: boolean;
  createdAt: number;
  updatedAt: number;
  likeCount: number;
  liked: boolean;
};

type CommentsSectionProps = {
  scriptId: string;
  viewer?: Viewer | null;
};

const formatDateTime = (timestamp: number) =>
  new Date(timestamp).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

export const CommentsSection = ({ scriptId, viewer }: CommentsSectionProps) => {
  const [items, setItems] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [newContent, setNewContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadComments = async () => {
    setLoading(true);
    setMessage(null);
    const response = await fetch(`/api/scripts/${scriptId}/comments`);
    if (!response.ok) {
      setMessage("评论加载失败，请稍后再试。");
      setLoading(false);
      return;
    }
    const data = (await response.json()) as { comments?: CommentItem[] };
    setItems(data.comments ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void loadComments();
  }, [scriptId]);

  const replyMap = useMemo(() => {
    const map = new Map<string, CommentItem[]>();
    for (const item of items) {
      if (!item.parentId) continue;
      if (item.isDeleted) continue;
      const list = map.get(item.parentId) ?? [];
      list.push(item);
      map.set(item.parentId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.createdAt - b.createdAt);
    }
    return map;
  }, [items]);

  const topLevel = useMemo(() => {
    const list = items
      .filter((item) => !item.parentId)
      .sort((a, b) => a.createdAt - b.createdAt);
    return list.filter(
      (item) => !item.isDeleted || (replyMap.get(item.id)?.length ?? 0) > 0
    );
  }, [items, replyMap]);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreate = async (parentId?: string) => {
    if (!viewer) {
      setMessage("请先登录再发表评论。");
      return;
    }
    const content = parentId ? replyContent.trim() : newContent.trim();
    if (!content) {
      setMessage("评论内容不能为空。");
      return;
    }

    const response = await fetch(`/api/scripts/${scriptId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(data?.message ?? "评论发布失败，请稍后再试。");
      return;
    }

    setMessage(null);
    if (parentId) {
      setReplyingTo(null);
      setReplyContent("");
    } else {
      setNewContent("");
    }
    void loadComments();
  };

  const handleLike = async (commentId: string) => {
    if (!viewer) {
      setMessage("请先登录再点赞。");
      return;
    }

    const response = await fetch(`/api/comments/${commentId}/like`, { method: "POST" });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(data?.message ?? "点赞失败，请稍后再试。");
      return;
    }

    const data = (await response.json()) as { liked?: boolean; likeCount?: number };
    setItems((prev) =>
      prev.map((item) =>
        item.id === commentId
          ? {
              ...item,
              liked: Boolean(data.liked),
              likeCount: data.likeCount ?? item.likeCount,
            }
          : item
      )
    );
  };

  const startEdit = (comment: CommentItem) => {
    setEditingId(comment.id);
    setEditingContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent("");
  };

  const handleEdit = async (commentId: string) => {
    const content = editingContent.trim();
    if (!content) {
      setMessage("评论内容不能为空。");
      return;
    }
    const response = await fetch(`/api/comments/${commentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(data?.message ?? "评论编辑失败，请稍后再试。");
      return;
    }

    cancelEdit();
    void loadComments();
  };

  const handleDelete = async (commentId: string) => {
    const confirmed = window.confirm("确定要删除这条评论吗？");
    if (!confirmed) return;
    const response = await fetch(`/api/comments/${commentId}`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(data?.message ?? "删除失败，请稍后再试。");
      return;
    }
    void loadComments();
  };

  return (
    <section className="grid gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-ink-900">评论区</h2>
        {!viewer && (
          <Link
            href={`/login?next=/scripts/${scriptId}`}
            className="text-sm text-ink-600 hover:text-ink-900"
          >
            登录后参与评论
          </Link>
        )}
      </div>

      <Card>
        <p className="text-sm text-ink-600">发布你的看法，分享创作建议。</p>
        <div className="mt-4 grid gap-3">
          <Textarea
            rows={4}
            value={newContent}
            onChange={(event) => setNewContent(event.target.value)}
            placeholder={viewer ? "写下你的评论..." : "登录后即可发表评论"}
            disabled={!viewer}
          />
          <div className="flex items-center gap-3">
            <Button type="button" onClick={() => handleCreate()} disabled={!viewer}>
              发表评论
            </Button>
            {message && <span className="text-xs text-ink-600">{message}</span>}
          </div>
        </div>
      </Card>

      {loading ? (
        <Card>
          <p className="text-sm text-ink-500">评论加载中...</p>
        </Card>
      ) : topLevel.length === 0 ? (
        <Card>
          <p className="text-sm text-ink-500">还没有评论，来抢沙发吧。</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {topLevel.map((comment) => {
            const replies = replyMap.get(comment.id) ?? [];
            const isExpanded = expanded.has(comment.id);
            const canEdit = viewer?.id === comment.authorId && !comment.isDeleted;
            const canReply = Boolean(viewer) && !comment.isDeleted;
            const canLike = Boolean(viewer) && !comment.isDeleted;
            const showPlaceholder = comment.isDeleted;

            return (
              <Card key={comment.id} className="grid gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {showPlaceholder ? (
                    <div className="text-xs text-ink-400">该评论已删除</div>
                  ) : (
                    <div className="text-xs text-ink-500">
                      <span className="font-semibold text-ink-700">{comment.authorName}</span> ·{" "}
                      {formatDateTime(comment.createdAt)}
                    </div>
                  )}
                  {!showPlaceholder && (
                    <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
                      <button
                        type="button"
                        onClick={() => handleLike(comment.id)}
                        className={`rounded-full px-3 py-1 ${
                          comment.liked
                            ? "bg-ink-900 text-paper-50"
                            : "border border-ink-200 text-ink-600 hover:border-ink-500"
                        }`}
                        disabled={!canLike}
                      >
                        赞 {comment.likeCount}
                      </button>
                      {canReply && (
                        <button
                          type="button"
                          onClick={() => setReplyingTo(comment.id)}
                          className="rounded-full border border-ink-200 px-3 py-1 text-ink-600 hover:border-ink-500"
                        >
                          回复
                        </button>
                      )}
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => startEdit(comment)}
                            className="rounded-full border border-ink-200 px-3 py-1 text-ink-600 hover:border-ink-500"
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(comment.id)}
                            className="rounded-full border border-ink-200 px-3 py-1 text-ink-600 hover:border-ink-500"
                          >
                            删除
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {!showPlaceholder && (
                  <>
                    {editingId === comment.id ? (
                      <div className="grid gap-2">
                        <Textarea
                          rows={3}
                          value={editingContent}
                          onChange={(event) => setEditingContent(event.target.value)}
                        />
                        <div className="flex items-center gap-2">
                          <Button type="button" onClick={() => handleEdit(comment.id)}>
                            保存
                          </Button>
                          <Button type="button" variant="outline" onClick={cancelEdit}>
                            取消
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-ink-700">{comment.content}</p>
                    )}

                    {replyingTo === comment.id && (
                      <div className="grid gap-2 rounded-2xl border border-ink-100 bg-paper-50/80 p-4">
                        <Textarea
                          rows={3}
                          value={replyContent}
                          onChange={(event) => setReplyContent(event.target.value)}
                          placeholder="写下你的回复..."
                        />
                        <div className="flex items-center gap-2">
                          <Button type="button" onClick={() => handleCreate(comment.id)}>
                            发布回复
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent("");
                            }}
                          >
                            取消
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {replies.length > 0 && (
                  <div className="grid gap-2">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(comment.id)}
                      className="w-fit text-xs text-ink-600 hover:text-ink-900"
                    >
                      {isExpanded ? "收起回复" : `展开 ${replies.length} 条回复`}
                    </button>
                    {isExpanded && (
                      <div className="grid gap-3 border-l border-ink-200 pl-4">
                        {replies.map((reply) => {
                          const canEditReply = viewer?.id === reply.authorId && !reply.isDeleted;
                          const canLikeReply = Boolean(viewer) && !reply.isDeleted;
                          return (
                            <div
                              key={reply.id}
                              className="grid gap-2 rounded-2xl border border-ink-100 bg-paper-50/70 p-4"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
                                <span>
                                  <span className="font-semibold text-ink-700">
                                    {reply.authorName}
                                  </span>{" "}
                                  · {formatDateTime(reply.createdAt)}
                                </span>
                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleLike(reply.id)}
                                    className={`rounded-full px-3 py-1 ${
                                      reply.liked
                                        ? "bg-ink-900 text-paper-50"
                                        : "border border-ink-200 text-ink-600 hover:border-ink-500"
                                    }`}
                                    disabled={!canLikeReply}
                                  >
                                    赞 {reply.likeCount}
                                  </button>
                                  {canEditReply && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => startEdit(reply)}
                                        className="rounded-full border border-ink-200 px-3 py-1 text-ink-600 hover:border-ink-500"
                                      >
                                        编辑
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(reply.id)}
                                        className="rounded-full border border-ink-200 px-3 py-1 text-ink-600 hover:border-ink-500"
                                      >
                                        删除
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                              {editingId === reply.id ? (
                                <div className="grid gap-2">
                                  <Textarea
                                    rows={3}
                                    value={editingContent}
                                    onChange={(event) => setEditingContent(event.target.value)}
                                  />
                                  <div className="flex items-center gap-2">
                                    <Button type="button" onClick={() => handleEdit(reply.id)}>
                                      保存
                                    </Button>
                                    <Button type="button" variant="outline" onClick={cancelEdit}>
                                      取消
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-ink-700">{reply.content}</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};
