"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type PublishButtonProps = {
  scriptId: string;
};

export const PublishButton = ({ scriptId }: PublishButtonProps) => {
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handlePublish = async () => {
    setPublishing(true);
    setMessage(null);

    const response = await fetch(`/api/scripts/${scriptId}/publish`, {
      method: "POST",
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(data?.message ?? "发布失败，请稍后再试。");
      setPublishing(false);
      return;
    }

    window.location.href = `/scripts/${scriptId}`;
  };

  return (
    <>
      <Button onClick={handlePublish} disabled={publishing}>
        {publishing ? "发布中..." : "发布到社区"}
      </Button>
      {message && <span className="text-xs text-ink-600">{message}</span>}
    </>
  );
};
