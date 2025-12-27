import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CollectionRemoveButton } from "@/components/scripts/CollectionRemoveButton";
import { getCurrentUser } from "@/lib/auth";
import { getBookmarkScripts, getFavoriteScripts } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const runtime = "edge";

type MePageProps = {
  searchParams?: Promise<{ tab?: string }>;
};

export default async function MePage({ searchParams }: MePageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/me");
  }

  const resolvedParams = (await searchParams) ?? {};
  const tab = resolvedParams.tab === "bookmark" ? "bookmark" : "favorite";
  const scripts = tab === "bookmark"
    ? await getBookmarkScripts(user.id)
    : await getFavoriteScripts(user.id);

  return (
    <div className="grid gap-8">
      <Card className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-500">个人中心</p>
          <h1 className="font-display text-2xl text-ink-900">{user.displayName}</h1>
          <p className="mt-2 text-sm text-ink-600">账号：{user.username}</p>
        </div>
        <Link href="/scripts/mine">
          <Button variant="outline">我的剧本</Button>
        </Link>
      </Card>

      <section className="grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={{ pathname: "/me", query: { tab: "favorite" } }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === "favorite"
                ? "bg-ink-900 text-paper-50 shadow-sm"
                : "border border-ink-200 text-ink-700 hover:border-ink-500"
            }`}
          >
            收藏
          </Link>
          <Link
            href={{ pathname: "/me", query: { tab: "bookmark" } }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              tab === "bookmark"
                ? "bg-ink-900 text-paper-50 shadow-sm"
                : "border border-ink-200 text-ink-700 hover:border-ink-500"
            }`}
          >
            书签
          </Link>
        </div>

        {scripts.length === 0 ? (
          <Card className="border-dashed border-ink-200 bg-paper-50/80 text-center text-sm text-ink-500">
            {tab === "favorite" ? "还没有收藏剧本。" : "还没有添加书签。"}
          </Card>
        ) : (
          <div className="grid gap-4">
            {scripts.map((script) => (
              <Card key={script.id} className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-[220px] flex-1">
                  <Link href={`/scripts/${script.id}`} className="font-display text-xl text-ink-900">
                    {script.title}
                  </Link>
                  <p className="mt-2 text-sm text-ink-600">{script.summary || "暂无简介"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {script.tags.length > 0 ? (
                      script.tags.map((tag) => <Badge key={tag}>#{tag}</Badge>)
                    ) : (
                      <span className="text-xs text-ink-400">未设置标签</span>
                    )}
                  </div>
                  <p className="mt-3 text-xs text-ink-500">
                    作者 {script.authorName || "匿名"} · {formatDate(script.createdAt)}
                  </p>
                </div>
                <div className="grid gap-2 text-right text-xs text-ink-500">
                  <span>{tab === "favorite" ? "收藏于" : "书签于"} {formatDate(script.savedAt)}</span>
                  <CollectionRemoveButton
                    scriptId={script.id}
                    type={tab === "favorite" ? "favorite" : "bookmark"}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
