"use client";

import { useState } from "react";

type ScriptCollectActionsProps = {
  scriptId: string;
  initialFavorited: boolean;
  initialBookmarked: boolean;
  initialFavoriteCount: number;
  initialBookmarkCount: number;
};

export const ScriptCollectActions = ({
  scriptId,
  initialFavorited,
  initialBookmarked,
  initialFavoriteCount,
  initialBookmarkCount,
}: ScriptCollectActionsProps) => {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [favoriteCount, setFavoriteCount] = useState(initialFavoriteCount);
  const [bookmarkCount, setBookmarkCount] = useState(initialBookmarkCount);
  const [message, setMessage] = useState<string | null>(null);

  const handleToggle = async (type: "favorite" | "bookmark") => {
    setMessage(null);
    const response = await fetch(`/api/scripts/${scriptId}/${type}`, { method: "POST" });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(data?.message ?? "操作失败，请稍后再试。");
      return;
    }
    const data = (await response.json()) as {
      favorited?: boolean;
      favoriteCount?: number;
      bookmarked?: boolean;
      bookmarkCount?: number;
    };
    if (type === "favorite") {
      setFavorited(Boolean(data.favorited));
      setFavoriteCount(data.favoriteCount ?? favoriteCount);
    } else {
      setBookmarked(Boolean(data.bookmarked));
      setBookmarkCount(data.bookmarkCount ?? bookmarkCount);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => handleToggle("favorite")}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          favorited
            ? "bg-ink-900 text-paper-50"
            : "border border-ink-200 text-ink-700 hover:border-ink-500"
        }`}
      >
        收藏 {favoriteCount}
      </button>
      <button
        type="button"
        onClick={() => handleToggle("bookmark")}
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          bookmarked
            ? "bg-ink-900 text-paper-50"
            : "border border-ink-200 text-ink-700 hover:border-ink-500"
        }`}
      >
        书签 {bookmarkCount}
      </button>
      {message && <span className="text-xs text-ink-600">{message}</span>}
    </div>
  );
};
