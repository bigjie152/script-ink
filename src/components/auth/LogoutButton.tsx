"use client";

import { Button } from "@/components/ui/Button";

export const LogoutButton = () => {
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/";
  };

  return (
    <Button variant="ghost" onClick={handleLogout}>
      退出
    </Button>
  );
};
