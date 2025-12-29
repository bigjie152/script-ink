"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

const scoreOptions = [1, 2, 3, 4, 5];

type RatingFormProps = {
  scriptId: string;
};

export const RatingForm = ({ scriptId }: RatingFormProps) => {
  const [logicScore, setLogicScore] = useState(4);
  const [proseScore, setProseScore] = useState(4);
  const [trickScore, setTrickScore] = useState(4);
  const [message, setMessage] = useState<string | null>(null);
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadStatus = async () => {
      const response = await fetch(`/api/scripts/${scriptId}/ratings`);
      if (!response.ok) return;
      const data = (await response.json()) as { hasRated?: boolean };
      if (!cancelled && data.hasRated) {
        setHasRated(true);
        setMessage("你已经评分过了。");
      }
    };

    void loadStatus();
    return () => {
      cancelled = true;
    };
  }, [scriptId]);

  const handleSubmit = async () => {
    setMessage(null);
    const response = await fetch(`/api/scripts/${scriptId}/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logicScore, proseScore, trickScore }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      if (response.status === 409) {
        setHasRated(true);
        setMessage(data?.message ?? "你已经评分过了。");
        return;
      }
      setMessage(data?.message ?? "评分提交失败，请稍后再试。");
      return;
    }

    setMessage("评分已提交");
    setHasRated(true);
    window.location.reload();
  };

  return (
    <div className="rounded-2xl border border-ink-100 bg-white/80 p-4">
      <h3 className="font-display text-base text-ink-900">给出你的评分</h3>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="text-xs text-ink-600">
          逻辑分
          <Select
            value={logicScore}
            onChange={(event) => setLogicScore(Number(event.target.value))}
          >
            {scoreOptions.map((score) => (
              <option key={score} value={score}>
                {score}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-xs text-ink-600">
          文笔分
          <Select
            value={proseScore}
            onChange={(event) => setProseScore(Number(event.target.value))}
          >
            {scoreOptions.map((score) => (
              <option key={score} value={score}>
                {score}
              </option>
            ))}
          </Select>
        </label>
        <label className="text-xs text-ink-600">
          诡计惊艳度
          <Select
            value={trickScore}
            onChange={(event) => setTrickScore(Number(event.target.value))}
          >
            {scoreOptions.map((score) => (
              <option key={score} value={score}>
                {score}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <Button type="button" onClick={handleSubmit} disabled={hasRated} className="px-3 py-1.5 text-xs">
          {hasRated ? "已评分" : "提交评分"}
        </Button>
        {message && <span className="text-xs text-ink-600">{message}</span>}
      </div>
    </div>
  );
};
