"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type RegisterFormProps = {
  next?: string;
};

export const RegisterForm = ({ next = "/" }: RegisterFormProps) => {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setMessage(null);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, displayName, password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setMessage(data?.message ?? "注册失败");
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
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        placeholder="显示名称（可选）"
      />
      <Input
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="密码"
        type="password"
      />
      <Button type="button" onClick={handleSubmit}>
        注册
      </Button>
      {message && <p className="text-xs text-ink-600">{message}</p>}
    </div>
  );
};
