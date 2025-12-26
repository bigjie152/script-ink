import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/auth";
import { getAuthorScripts } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const runtime = "edge";

export default async function MyScriptsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/scripts/mine");
  }

  const scripts = await getAuthorScripts(user.id);

  return (
    <div className="grid gap-6">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-ink-100 bg-white/80 p-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-500">我的剧本仓库</p>
          <h1 className="font-display text-2xl text-ink-900">管理你的剧本版本</h1>
          <p className="mt-2 text-sm text-ink-600">私有内容仅你可见，公开后将进入社区。</p>
        </div>
        <Link href="/scripts/new">
          <Button>新建剧本</Button>
        </Link>
      </section>

      {scripts.length === 0 ? (
        <Card className="border-dashed border-ink-200 bg-paper-50/80 text-center text-sm text-ink-500">
          你还没有创建剧本，先去新建一个吧。
        </Card>
      ) : (
        <div className="grid gap-4">
          {scripts.map((script) => (
            <Card key={script.id} className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-[220px] flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl text-ink-900">{script.title}</h2>
                  {script.isPublic === 1 ? (
                    <Badge>已公开</Badge>
                  ) : (
                    <Badge className="border-dashed">私有草稿</Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-ink-600">
                  {script.summary || "暂无简介"}
                </p>
                <p className="mt-2 text-xs text-ink-500">
                  更新于 {formatDate(script.updatedAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/scripts/${script.id}/edit`}>
                  <Button variant="outline">编辑</Button>
                </Link>
                <Link href={`/scripts/${script.id}/preview`}>
                  <Button variant="outline">预览</Button>
                </Link>
                {script.isPublic === 1 && (
                  <Link href={`/scripts/${script.id}`}>
                    <Button>公开页</Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
