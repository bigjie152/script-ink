import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatDate } from "@/lib/utils";

type ScriptCardProps = {
  id: string;
  title: string;
  summary: string | null;
  authorName?: string | null;
  createdAt: number;
  tags: string[];
  rating: { average: number; count: number; hotScore: number };
  forkCount: number;
};

export const ScriptCard = ({
  id,
  title,
  summary,
  authorName,
  createdAt,
  tags,
  rating,
  forkCount,
}: ScriptCardProps) => {
  return (
    <Card className="flex h-full flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href={`/scripts/${id}`} className="font-display text-xl text-ink-900">
            {title}
          </Link>
          <p className="mt-2 max-h-16 overflow-hidden text-sm text-ink-600">
            {summary || "暂无简介"}
          </p>
        </div>
        <div className="text-right text-xs text-ink-500">
          <p>{formatDate(createdAt)}</p>
          <p className="mt-1">{authorName || "匿名"}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.length > 0 ? (
          tags.map((tag) => <Badge key={tag}>#{tag}</Badge>)
        ) : (
          <span className="text-xs text-ink-400">未设置标签</span>
        )}
      </div>
      <div className="mt-auto flex items-center justify-between text-xs text-ink-500">
        <span>评分 {rating.average.toFixed(1)} · {rating.count} 人</span>
        <span>Fork {forkCount}</span>
      </div>
    </Card>
  );
};
