"use client";

import { useMemo, useState, type CSSProperties } from "react";
import { MarkdownBlock } from "@/components/scripts/MarkdownBlock";

type ExpandableMarkdownProps = {
  content: string;
  summaryLines?: number;
};

const readOnlyBlock =
  "rounded-2xl border border-ink-200/80 bg-paper-50 px-4 py-3 text-sm text-ink-900 shadow-[inset_0_1px_6px_rgba(24,36,38,0.08)] max-h-[420px] overflow-y-auto";
const previewBlock =
  "rounded-2xl border border-ink-200/80 bg-paper-50 px-4 py-3 text-sm text-ink-900 shadow-[inset_0_1px_6px_rgba(24,36,38,0.08)] max-h-[4.5rem] overflow-hidden";

const toPlainText = (value: string) =>
  value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]*`/g, "")
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[#>*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const ExpandableMarkdown = ({ content, summaryLines = 3 }: ExpandableMarkdownProps) => {
  const trimmed = content.trim();
  const plainText = useMemo(() => toPlainText(trimmed), [trimmed]);
  const showToggle = plainText.length > 120;
  const [expanded, setExpanded] = useState(false);

  if (!showToggle) {
    return (
      <div className={readOnlyBlock}>
        <MarkdownBlock content={content} />
      </div>
    );
  }

  const previewStyle: CSSProperties = {
    display: "-webkit-box",
    WebkitLineClamp: summaryLines,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  };

  return (
    <div className="grid gap-2">
      {expanded ? (
        <div className={readOnlyBlock}>
          <MarkdownBlock content={content} />
        </div>
      ) : (
        <div className={previewBlock}>
          <p className="text-sm text-ink-700 leading-relaxed" style={previewStyle}>
            {plainText}
          </p>
        </div>
      )}
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="w-fit text-xs text-ink-600 hover:text-ink-900"
      >
        {expanded ? "收起内容" : "继续阅读"}
      </button>
    </div>
  );
};
