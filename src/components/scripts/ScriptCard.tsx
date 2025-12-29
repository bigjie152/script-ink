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
  activeSort?: "latest" | "hot";
  activeQuery?: string;
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
  activeSort = "latest",
  activeQuery,
}: ScriptCardProps) => {
  return (
    <Card className="group relative flex h-full flex-col gap-4 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-accent-500/80 via-accent-300/80 to-transparent" />
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href={`/scripts/${id}`}
            className="font-display text-xl text-ink-900 transition group-hover:text-ink-800"
          >
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
          tags.map((tag) => (
            <Link
              key={tag}
              href={{
                pathname: "/",
                query: {
                  sort: activeSort,
                  ...(activeQuery ? { q: activeQuery } : {}),
                  tag,
                },
              }}
            >
              <Badge>#{tag}</Badge>
            </Link>
          ))
        ) : (
          <span className="text-xs text-ink-400">未设置标签</span>
        )}
      </div>
      <div className="mt-auto flex items-center justify-between text-xs text-ink-500">
        <span>评分 {rating.average.toFixed(1)} · {rating.count} 人</span>
        <span>改编 {forkCount}</span>
      </div>
    </Card>
  );
};
