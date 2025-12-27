import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CollectionRemoveButton } from "@/components/scripts/CollectionRemoveButton";
import { getCurrentUser } from "@/lib/auth";
import { getFavoriteFolders, getFavoriteScripts, getLikedScripts, getUserComments } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const runtime = "edge";

type MePageProps = {
  searchParams?: Promise<{ folder?: string; tab?: string }>;
};

export default async function MePage({ searchParams }: MePageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/me");
  }

  const resolvedParams = (await searchParams) ?? {};
  const tabParam = String(resolvedParams.tab ?? "").trim();
  const activeTab = tabParam === "comments" ? "comments" : tabParam === "likes" ? "likes" : "favorites";

  const folders = activeTab === "favorites" ? await getFavoriteFolders(user.id) : [];
  const folderParam = String(resolvedParams.folder ?? "").trim();
  const activeFolder = folders.find((folder) => folder.name === folderParam)?.name
    ?? folders[0]?.name
    ?? "默认收藏夹";

  const scripts = activeTab === "favorites" ? await getFavoriteScripts(user.id, activeFolder) : [];
  const comments = activeTab === "comments" ? await getUserComments(user.id) : [];
  const likedScripts = activeTab === "likes" ? await getLikedScripts(user.id) : [];

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
            href={{ pathname: "/me", query: { tab: "favorites" } }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "favorites"
                ? "bg-ink-900 text-paper-50 shadow-sm"
                : "border border-ink-200 text-ink-700 hover:border-ink-500"
            }`}
          >
            收藏的剧本
          </Link>
          <Link
            href={{ pathname: "/me", query: { tab: "comments" } }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "comments"
                ? "bg-ink-900 text-paper-50 shadow-sm"
                : "border border-ink-200 text-ink-700 hover:border-ink-500"
            }`}
          >
            我的评论
          </Link>
          <Link
            href={{ pathname: "/me", query: { tab: "likes" } }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === "likes"
                ? "bg-ink-900 text-paper-50 shadow-sm"
                : "border border-ink-200 text-ink-700 hover:border-ink-500"
            }`}
          >
            我的点赞
          </Link>
        </div>

        {activeTab === "favorites" && (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {folders.map((folder) => (
                <Link
                  key={folder.name}
                  href={{ pathname: "/me", query: { tab: "favorites", folder: folder.name } }}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activeFolder === folder.name
                      ? "bg-ink-900 text-paper-50 shadow-sm"
                      : "border border-ink-200 text-ink-700 hover:border-ink-500"
                  }`}
                >
                  {folder.name} · {folder.count}
                </Link>
              ))}
            </div>

            {scripts.length === 0 ? (
              <Card className="border-dashed border-ink-200 bg-paper-50/80 text-center text-sm text-ink-500">
                这个收藏夹还没有剧本。
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
                      <span>收藏于 {formatDate(script.savedAt)}</span>
                      <CollectionRemoveButton scriptId={script.id} />
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "comments" && (
          <>
            {comments.length === 0 ? (
              <Card className="border-dashed border-ink-200 bg-paper-50/80 text-center text-sm text-ink-500">
                暂无评论记录。
              </Card>
            ) : (
              <div className="grid gap-4">
                {comments.map((comment) => (
                  <Card key={comment.id} className="grid gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-500">
                      <Link href={`/scripts/${comment.scriptId}`} className="text-ink-900">
                        {comment.scriptTitle || "剧本已删除"}
                      </Link>
                      <span>{formatDate(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-ink-700">
                      {comment.isDeleted ? "评论已删除" : comment.content}
                    </p>
                    <span className="text-xs text-ink-500">点赞 {comment.likeCount}</span>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "likes" && (
          <>
            {likedScripts.length === 0 ? (
              <Card className="border-dashed border-ink-200 bg-paper-50/80 text-center text-sm text-ink-500">
                暂无点赞的剧本。
              </Card>
            ) : (
              <div className="grid gap-4">
                {likedScripts.map((script) => (
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
                      <span>点赞于 {formatDate(script.likedAt)}</span>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
