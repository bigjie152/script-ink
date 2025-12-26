"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type LoginFormProps = {
  next?: string;
};

export const LoginForm = ({ next = "/" }: LoginFormProps) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setMessage(null);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(data?.message ?? "登录失败");
      return;
    }

    window.location.href = next;
  };

  return (
    <div className="grid gap-4">
      <Input
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        placeholder="用户名"
      />
      <Input
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="密码"
        type="password"
      />
      <Button type="button" onClick={handleSubmit}>
        登录
      </Button>
      {message && <p className="text-xs text-ink-600">{message}</p>}
    </div>
  );
};
