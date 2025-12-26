"use client";

import { useState } from "react";
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

  const handleSubmit = async () => {
    setMessage(null);
    const response = await fetch(`/api/scripts/${scriptId}/ratings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logicScore, proseScore, trickScore }),
    });

    if (!response.ok) {
      setMessage("评分提交失败，请稍后再试。");
      return;
    }

    setMessage("评分已提交");
    window.location.reload();
  };

  return (
    <div className="rounded-3xl border border-ink-100 bg-white/80 p-6">
      <h3 className="font-display text-lg text-ink-900">给出你的评分</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
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
      <div className="mt-4 flex items-center gap-3">
        <Button type="button" onClick={handleSubmit}>
          提交评分
        </Button>
        {message && <span className="text-xs text-ink-600">{message}</span>}
      </div>
    </div>
  );
};
