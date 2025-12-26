"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

type DeleteScriptButtonProps = {
  scriptId: string;
  onDeleted?: () => void;
};

export const DeleteScriptButton = ({ scriptId, onDeleted }: DeleteScriptButtonProps) => {
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleDelete = async () => {
    const confirmed = window.confirm("确定要删除这个剧本吗？此操作不可恢复。");
    if (!confirmed) return;

    setDeleting(true);
    setMessage(null);

    const response = await fetch(`/api/scripts/${scriptId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(data?.message ?? "删除失败，请稍后再试。");
      setDeleting(false);
      return;
    }

    if (onDeleted) {
      onDeleted();
      return;
    }

    window.location.reload();
  };

  return (
    <>
      <Button variant="outline" onClick={handleDelete} disabled={deleting}>
        {deleting ? "删除中..." : "删除"}
      </Button>
      {message && <span className="text-xs text-ink-600">{message}</span>}
    </>
  );
};
