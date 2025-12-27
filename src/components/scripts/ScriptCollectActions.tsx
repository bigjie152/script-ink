"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

type ScriptCollectActionsProps = {
  scriptId: string;
  initialFavorited: boolean;
  initialFavoriteCount: number;
  initialFolder: string;
  folders: string[];
};

const DEFAULT_FOLDER = "默认收藏夹";

export const ScriptCollectActions = ({
  scriptId,
  initialFavorited,
  initialFavoriteCount,
  initialFolder,
  folders,
}: ScriptCollectActionsProps) => {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [favoriteCount, setFavoriteCount] = useState(initialFavoriteCount);
  const [folder, setFolder] = useState(initialFolder || DEFAULT_FOLDER);
  const [folderList, setFolderList] = useState(
    folders.length > 0 ? folders : [DEFAULT_FOLDER]
  );
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolder, setNewFolder] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resolveFolder = () => {
    if (showNewFolder) {
      return newFolder.trim();
    }
    return folder.trim() || DEFAULT_FOLDER;
  };

  const handleSave = async () => {
    const nextFolder = resolveFolder();
    if (!nextFolder) {
      setMessage("请输入收藏夹名称。");
      return;
    }
    if (favorited && nextFolder === folder) {
      setMessage("已在该收藏夹。");
      return;
    }

    setLoading(true);
    setMessage(null);
    const method = favorited ? "PUT" : "POST";
    const response = await fetch(`/api/scripts/${scriptId}/favorite`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder: nextFolder }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(data?.message ?? "收藏失败，请稍后再试。");
      setLoading(false);
      return;
    }

    const data = (await response.json()) as {
      favorited?: boolean;
      favoriteCount?: number;
      favoriteFolder?: string;
    };
    const updatedFolder = data.favoriteFolder ?? nextFolder;
    setFavorited(Boolean(data.favorited));
    setFavoriteCount(data.favoriteCount ?? favoriteCount);
    setFolder(updatedFolder);
    if (!folderList.includes(updatedFolder)) {
      setFolderList((prev) => [...prev, updatedFolder]);
    }
    setShowNewFolder(false);
    setNewFolder("");
    setLoading(false);
  };

  const handleRemove = async () => {
    setLoading(true);
    setMessage(null);
    const response = await fetch(`/api/scripts/${scriptId}/favorite`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null;
      setMessage(data?.message ?? "取消收藏失败，请稍后再试。");
      setLoading(false);
      return;
    }
    const data = (await response.json()) as { favoriteCount?: number };
    setFavorited(false);
    setFavoriteCount(data.favoriteCount ?? favoriteCount);
    setLoading(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="min-w-[160px]">
        {showNewFolder ? (
          <Input
            value={newFolder}
            onChange={(event) => setNewFolder(event.target.value)}
            placeholder="新建收藏夹"
          />
        ) : (
          <Select value={folder} onChange={(event) => setFolder(event.target.value)}>
            {folderList.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        )}
      </div>
      <Button onClick={handleSave} disabled={loading}>
        {favorited ? "更新收藏夹" : "收藏"}
      </Button>
      {favorited && (
        <Button variant="outline" onClick={handleRemove} disabled={loading}>
          取消收藏
        </Button>
      )}
      <span className="text-xs text-ink-500">收藏数 {favoriteCount}</span>
      <button
        type="button"
        onClick={() => setShowNewFolder((prev) => !prev)}
        className="text-xs text-ink-600 hover:text-ink-900"
      >
        {showNewFolder ? "选择已有收藏夹" : "新建收藏夹"}
      </button>
      {message && <span className="text-xs text-ink-600">{message}</span>}
    </div>
  );
};
