"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type ScriptLikeButtonProps = {
  scriptId: string;
  initialLiked: boolean;
  initialLikeCount: number;
};

export const ScriptLikeButton = ({
  scriptId,
  initialLiked,
  initialLikeCount,
}: ScriptLikeButtonProps) => {
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleToggle = async () => {
    setLoading(true);
    setMessage(null);
    const response = await fetch(`/api/scripts/${scriptId}/like`, { method: "POST" });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(data?.message ?? "点赞失败，请稍后再试。");
      setLoading(false);
      return;
    }
    const data = (await response.json()) as { liked?: boolean; likeCount?: number };
    setLiked(Boolean(data.liked));
    setLikeCount(data.likeCount ?? likeCount);
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant={liked ? "primary" : "outline"} onClick={handleToggle} disabled={loading}>
        {liked ? "已赞" : "点赞"} {likeCount}
      </Button>
      {message && <span className="text-xs text-ink-600">{message}</span>}
    </div>
  );
};
