import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ForkButton } from "@/components/scripts/ForkButton";
import { ScriptCollectActions } from "@/components/scripts/ScriptCollectActions";
import { ScriptLikeButton } from "@/components/scripts/ScriptLikeButton";
import { MarkdownBlock } from "@/components/scripts/MarkdownBlock";
import { RatingForm } from "@/components/scripts/RatingForm";
import { CommentsSection } from "@/components/scripts/CommentsSection";
import { getCurrentUser } from "@/lib/auth";
import {
  getFavoriteFolders,
  getScriptCollections,
  getScriptContributors,
  getScriptDetail,
  getScriptForkChain,
  getScriptLikeSummary,
} from "@/lib/data";
import { linkifyMentions } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";

export const runtime = "edge";

type ScriptPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ScriptPage({ params }: ScriptPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  const detail = await getScriptDetail(id);

  if (!detail) {
    notFound();
  }

  const isOwner = user?.id === detail.script.authorId;
  if (!detail.script.isPublic && !isOwner) {
    notFound();
  }

  const parentScript = detail.script.parentId
    ? await getScriptForkChain(detail.script.parentId)
    : null;

  const dmBackground = detail.sections.find((section) => section.sectionType === "dm_background")?.contentMd ?? "";
  const dmFlow = detail.sections.find((section) => section.sectionType === "dm_flow")?.contentMd
    ?? detail.sections.find((section) => section.sectionType === "dm")?.contentMd
    ?? "";
  const truth = detail.sections.find((section) => section.sectionType === "truth")?.contentMd
    ?? detail.sections.find((section) => section.sectionType === "outline")?.contentMd
    ?? "";
  const dmBackgroundContent = linkifyMentions(dmBackground, detail.roles, detail.clues);
  const dmFlowContent = linkifyMentions(dmFlow, detail.roles, detail.clues);
  const truthContent = linkifyMentions(truth, detail.roles, detail.clues);
  const collections = detail.script.isPublic === 1
    ? await getScriptCollections(detail.script.id, user?.id)
    : null;
  const likeSummary = detail.script.isPublic === 1
    ? await getScriptLikeSummary(detail.script.id, user?.id)
    : null;
  const favoriteFolders = user ? await getFavoriteFolders(user.id) : [];
  const contributors = await getScriptContributors(detail.script.id);

  return (
    <div className="grid gap-8">
      <section className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-500">剧本详情</p>
            <h1 className="font-display text-3xl text-ink-900">{detail.script.title}</h1>
            <p className="mt-2 text-sm text-ink-600">{detail.script.summary || "暂无简介"}</p>
            <p className="mt-3 text-xs text-ink-500">
              作者 {detail.script.authorName || "匿名"} · {formatDate(detail.script.createdAt)}
            </p>
            {parentScript && (
              <p className="mt-2 text-xs text-ink-500">
                衍生自
                <Link href={`/scripts/${parentScript.id}`} className="ml-2 text-ink-900">
                  {parentScript.title}
                </Link>
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {isOwner && (
              <>
                <Link href={`/scripts/${detail.script.id}/edit`}>
                  <Button variant="outline">编辑剧本</Button>
                </Link>
                <Link href={`/scripts/${detail.script.id}/preview`}>
                  <Button variant="outline">发布前预览</Button>
                </Link>
              </>
            )}
            {detail.script.allowFork === 1 && user && <ForkButton scriptId={detail.script.id} />}
            {detail.script.allowFork === 1 && !user && (
              <Link href={`/login?next=/scripts/${detail.script.id}`}>
                <Button variant="outline">登录后改编</Button>
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {detail.script.isPublic !== 1 && <Badge>私有草稿</Badge>}
          {detail.tags.length > 0 ? (
            detail.tags.map((tag) => <Badge key={tag}>#{tag}</Badge>)
          ) : (
            <span className="text-xs text-ink-500">未设置标签</span>
          )}
        </div>
        {detail.script.isPublic === 1 && (
          <div className="flex flex-wrap items-center gap-3 text-sm text-ink-600">
            {user ? (
              <>
                <ScriptCollectActions
                  scriptId={detail.script.id}
                  initialFavorited={collections?.favorited ?? false}
                  initialFavoriteCount={collections?.favoriteCount ?? 0}
                  initialFolder={collections?.favoriteFolder ?? "默认收藏夹"}
                  folders={favoriteFolders.map((folder) => folder.name)}
                />
                <ScriptLikeButton
                  scriptId={detail.script.id}
                  initialLiked={likeSummary?.liked ?? false}
                  initialLikeCount={likeSummary?.likeCount ?? 0}
                />
              </>
            ) : (
              <>
                <Link href={`/login?next=/scripts/${detail.script.id}`}>
                  <Button variant="outline">收藏 {collections?.favoriteCount ?? 0}</Button>
                </Link>
                <Link href={`/login?next=/scripts/${detail.script.id}`}>
                  <Button variant="outline">点赞 {likeSummary?.likeCount ?? 0}</Button>
                </Link>
              </>
            )}
          </div>
        )}
        <div className="grid gap-3 text-sm text-ink-600 md:grid-cols-4">
          <Card>
            <p className="text-xs uppercase text-ink-500">评分均值</p>
            <p className="mt-2 text-2xl font-display text-ink-900">
              {detail.rating.average.toFixed(1)}
            </p>
          </Card>
          <Card>
            <p className="text-xs uppercase text-ink-500">评分人数</p>
            <p className="mt-2 text-2xl font-display text-ink-900">{detail.rating.count}</p>
          </Card>
          <Card>
            <p className="text-xs uppercase text-ink-500">收藏数</p>
            <p className="mt-2 text-2xl font-display text-ink-900">
              {collections?.favoriteCount ?? 0}
            </p>
          </Card>
          <Card>
            <p className="text-xs uppercase text-ink-500">改编可用</p>
            <p className="mt-2 text-2xl font-display text-ink-900">
              {detail.script.allowFork === 1 ? "是" : "否"}
            </p>
          </Card>
        </div>
        <Card>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-500">共创者</p>
          {contributors.length === 0 ? (
            <p className="mt-2 text-sm text-ink-500">暂无共创者，欢迎改编共创。</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {contributors.slice(0, 8).map((person) => (
                <Badge key={person.authorId}>
                  {person.authorName} · {person.count}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-500">问题单面板</p>
            <p className="mt-2 text-sm text-ink-600">把反馈结构化，避免评论混战。</p>
          </div>
          <Link href={`/scripts/${detail.script.id}/issues`}>
            <Button variant="outline">进入</Button>
          </Link>
        </Card>
        <Card className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-500">版本记录</p>
            <p className="mt-2 text-sm text-ink-600">查看每次更新的演进轨迹。</p>
          </div>
          <Link href={`/scripts/${detail.script.id}/versions`}>
            <Button variant="outline">查看</Button>
          </Link>
        </Card>
        <Card className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-500">改编谱系</p>
            <p className="mt-2 text-sm text-ink-600">追踪衍生分支与家族关系。</p>
          </div>
          <Link href={`/scripts/${detail.script.id}/lineage`}>
            <Button variant="outline">浏览</Button>
          </Link>
        </Card>
        <Card className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-500">改编合并</p>
            <p className="mt-2 text-sm text-ink-600">向原作者提交合并申请。</p>
          </div>
          <Link href={`/scripts/${detail.script.id}/merge`}>
            <Button variant="outline">管理</Button>
          </Link>
        </Card>
      </section>

      <section className="grid gap-6">
        <Card>
          <details className="group" open>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <h2 className="font-display text-xl text-ink-900">DM 手册 / 游戏流程</h2>
              <span className="rounded-full border border-ink-200 px-3 py-1 text-xs text-ink-600">
                展开/收起
              </span>
            </summary>
            <div className="mt-4 grid gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-ink-500">背景简介</p>
                <MarkdownBlock content={dmBackgroundContent || "暂无内容"} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-ink-500">游戏流程</p>
                <MarkdownBlock content={dmFlowContent || "暂无内容"} />
              </div>
            </div>
          </details>
        </Card>
        <Card>
          <details className="group" open>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <h2 className="font-display text-xl text-ink-900">真相</h2>
              <span className="rounded-full border border-ink-200 px-3 py-1 text-xs text-ink-600">
                展开/收起
              </span>
            </summary>
            <div className="mt-4">
              <MarkdownBlock content={truthContent || "暂无内容"} />
            </div>
          </details>
        </Card>
      </section>

      <section className="grid gap-6">
        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <h2 className="font-display text-xl text-ink-900">人物剧本</h2>
              <span className="rounded-full border border-ink-200 px-3 py-1 text-xs text-ink-600">
                展开/收起
              </span>
            </summary>
            <div className="mt-4 grid gap-4">
              {detail.roles.length === 0 ? (
                <p className="text-sm text-ink-500">暂无角色</p>
              ) : (
                detail.roles.map((role) => (
                  <div key={role.id} id={`role-${role.id}`} className="rounded-2xl border border-ink-100 bg-paper-50/80 p-4">
                    <h3 className="font-display text-lg text-ink-900">{role.name || "未命名角色"}</h3>
                    <div className="mt-3 grid gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-500">角色剧情</p>
                        <MarkdownBlock content={linkifyMentions(role.contentMd, detail.roles, detail.clues)} />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-500">角色任务</p>
                        <MarkdownBlock content={linkifyMentions(role.taskMd ?? "", detail.roles, detail.clues) || "暂无内容"} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </details>
        </Card>
        <Card>
          <details className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <h2 className="font-display text-xl text-ink-900">线索库</h2>
              <span className="rounded-full border border-ink-200 px-3 py-1 text-xs text-ink-600">
                展开/收起
              </span>
            </summary>
            <div className="mt-4 grid gap-4">
              {detail.clues.length === 0 ? (
                <p className="text-sm text-ink-500">暂无线索</p>
              ) : (
                detail.clues.map((clue) => (
                  <div key={clue.id} id={`clue-${clue.id}`} className="rounded-2xl border border-ink-100 bg-paper-50/80 p-4">
                    <h3 className="font-display text-lg text-ink-900">{clue.title || "未命名线索"}</h3>
                    <div className="mt-3 grid gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-500">触发环节 / 条件</p>
                        <MarkdownBlock content={linkifyMentions(clue.triggerMd ?? "", detail.roles, detail.clues) || "暂无内容"} />
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.2em] text-ink-500">线索内容</p>
                        <MarkdownBlock content={linkifyMentions(clue.contentMd, detail.roles, detail.clues)} />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </details>
        </Card>
      </section>

      {detail.script.isPublic === 1 ? (
        user ? (
          <RatingForm scriptId={detail.script.id} />
        ) : (
          <Card>
            <p className="text-sm text-ink-600">
              登录后可以评分并参与社区讨论。
              <Link href={`/login?next=/scripts/${detail.script.id}`} className="ml-2 text-ink-900">
                去登录
              </Link>
            </p>
          </Card>
        )
      ) : (
        <Card>
          <p className="text-sm text-ink-600">私有剧本不参与社区评分。</p>
        </Card>
      )}

      {detail.script.isPublic === 1 ? (
        <CommentsSection
          scriptId={detail.script.id}
          viewer={user ? { id: user.id, displayName: user.displayName } : null}
        />
      ) : (
        <Card>
          <p className="text-sm text-ink-600">私有剧本暂不开放评论。</p>
        </Card>
      )}
    </div>
  );
}
