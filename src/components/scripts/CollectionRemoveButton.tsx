"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type CollectionRemoveButtonProps = {
  scriptId: string;
};

export const CollectionRemoveButton = ({ scriptId }: CollectionRemoveButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleRemove = async () => {
    setLoading(true);
    setMessage(null);
    const response = await fetch(`/api/scripts/${scriptId}/favorite`, { method: "DELETE" });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(data?.message ?? "操作失败，请稍后再试。");
      setLoading(false);
      return;
    }
    window.location.reload();
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={handleRemove} disabled={loading}>
        {loading ? "处理中..." : "取消收藏"}
      </Button>
      {message && <span className="text-xs text-ink-600">{message}</span>}
    </div>
  );
};
