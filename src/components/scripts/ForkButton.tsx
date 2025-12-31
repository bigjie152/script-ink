"use client";

import { Button } from "@/components/ui/Button";

export const ForkButton = ({ scriptId }: { scriptId: string }) => {
  const handleFork = async () => {
    const response = await fetch(`/api/scripts/${scriptId}/fork`, { method: "POST" });
    if (!response.ok) {
      alert("改编失败，请确认是否已登录。");
      return;
    }
    const data = (await response.json().catch(() => null)) as { id?: string } | null;
    if (!data?.id) {
      alert("改编失败，请稍后再试。");
      return;
    }
    window.location.href = `/scripts/${data.id}/edit-v2`;
  };

  return (
    <Button type="button" onClick={handleFork}>
      改编到我的空间
    </Button>
  );
};
