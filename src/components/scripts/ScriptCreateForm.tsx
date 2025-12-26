"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

export const ScriptCreateForm = () => {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [tags, setTags] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [allowFork, setAllowFork] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setMessage(null);
    if (!title.trim()) {
      setMessage("请填写剧本标题。");
      return;
    }

    const response = await fetch("/api/scripts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, summary, tags, isPublic, allowFork }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setMessage(data?.message ?? "创建失败");
      return;
    }

    const data = await response.json();
    window.location.href = `/scripts/${data.id}/edit`;
  };

  return (
    <div className="grid gap-4">
      <Input
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="剧本标题"
      />
      <Textarea
        rows={3}
        value={summary}
        onChange={(event) => setSummary(event.target.value)}
        placeholder="剧本简介"
      />
      <Input
        value={tags}
        onChange={(event) => setTags(event.target.value)}
        placeholder="#古风 #密室 #高智商"
      />
      <div className="flex flex-wrap gap-3 text-xs text-ink-600">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(event) => setIsPublic(event.target.checked)}
          />
          公开发布
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allowFork}
            onChange={(event) => setAllowFork(event.target.checked)}
          />
          允许 Fork
        </label>
      </div>
      <Button type="button" onClick={handleSubmit}>
        创建并进入编辑
      </Button>
      {message && <p className="text-xs text-ink-600">{message}</p>}
    </div>
  );
};
