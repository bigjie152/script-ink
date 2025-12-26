"use client";

import { Button } from "@/components/ui/Button";

export const ForkButton = ({ scriptId }: { scriptId: string }) => {
  const handleFork = async () => {
    const response = await fetch(`/api/scripts/${scriptId}/fork`, { method: "POST" });
    if (!response.ok) {
      alert("Fork 失败，请确认是否已登录。");
      return;
    }
    const data = (await response.json().catch(() => null)) as { id?: string } | null;
    if (!data?.id) {
      alert("Fork 失败，请稍后再试。");
      return;
    }
    window.location.href = `/scripts/${data.id}/edit`;
  };

  return (
    <Button type="button" onClick={handleFork}>
      Fork 到我的空间
    </Button>
  );
};
