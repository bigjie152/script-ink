import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MarkdownBlock } from "@/components/scripts/MarkdownBlock";
import { PublishButton } from "@/components/scripts/PublishButton";
import { getCurrentUser } from "@/lib/auth";
import { getScriptDetail } from "@/lib/data";
import { linkifyMentions } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";

export const runtime = "edge";

type PreviewPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PreviewScriptPage({ params }: PreviewPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=/scripts/${id}/preview`);
  }

  const detail = await getScriptDetail(id);
  if (!detail) {
    notFound();
  }

  if (detail.script.authorId !== user.id) {
    redirect(`/scripts/${id}`);
  }

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

  return (
    <div className="grid gap-8">
      <Card className="border-dashed border-accent-300 bg-paper-50/80">
        <p className="text-xs uppercase tracking-[0.2em] text-accent-500">发布前预览</p>
        <h1 className="font-display text-2xl text-ink-900">{detail.script.title}</h1>
        <p className="mt-2 text-sm text-ink-600">此页面仅作者可见。</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href={`/scripts/${detail.script.id}/edit`}>
            <Button variant="outline">返回编辑</Button>
          </Link>
          {detail.script.isPublic === 1 ? (
            <Link href={`/scripts/${detail.script.id}`}>
              <Button>进入公开页面</Button>
            </Link>
          ) : (
            <PublishButton scriptId={detail.script.id} />
          )}
        </div>
      </Card>

      <section className="grid gap-4">
        <div>
          <h2 className="font-display text-3xl text-ink-900">{detail.script.title}</h2>
          <p className="mt-2 text-sm text-ink-600">{detail.script.summary || "暂无简介"}</p>
          <p className="mt-3 text-xs text-ink-500">
            作者 {detail.script.authorName || "匿名"} · {formatDate(detail.script.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {detail.tags.length > 0 ? (
            detail.tags.map((tag) => <Badge key={tag}>#{tag}</Badge>)
          ) : (
            <span className="text-xs text-ink-500">未设置标签</span>
          )}
        </div>
      </section>

      <section className="grid gap-6">
        <Card>
          <details className="group" open>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
              <h3 className="font-display text-xl text-ink-900">DM 手册 / 游戏流程</h3>
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
              <h3 className="font-display text-xl text-ink-900">真相</h3>
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
              <h3 className="font-display text-xl text-ink-900">人物剧本</h3>
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
                    <h4 className="font-display text-lg text-ink-900">{role.name || "未命名角色"}</h4>
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
              <h3 className="font-display text-xl text-ink-900">线索库</h3>
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
                    <h4 className="font-display text-lg text-ink-900">{clue.title || "未命名线索"}</h4>
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
    </div>
  );
}
