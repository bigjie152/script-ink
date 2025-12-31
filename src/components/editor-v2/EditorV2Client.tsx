"use client";

import dynamic from "next/dynamic";

const EditorV2 = dynamic(
  () => import("./EditorV2").then((mod) => mod.EditorV2),
  {
    ssr: false,
    loading: () => <div className="text-sm text-ink-600">Loading editor...</div>,
  }
);

export function EditorV2Client({ scriptId }: { scriptId: string }) {
  return <EditorV2 scriptId={scriptId} />;
}
