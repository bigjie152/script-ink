import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { MarkdownBlock } from "@/components/scripts/MarkdownBlock";
import { getCurrentUser } from "@/lib/auth";
import { getScriptDetail } from "@/lib/data";
import { linkifyMentions } from "@/lib/markdown";
import { formatDate } from "@/lib/utils";

export const runtime = "edge";

type PreviewPageProps = {
  params: { id: string };
};

export default async function PreviewScriptPage({ params }: PreviewPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=/scripts/${params.id}/preview`);
  }

  const detail = await getScriptDetail(params.id);
  if (!detail) {
    notFound();
  }

  if (detail.script.authorId !== user.id) {
    redirect(`/scripts/${params.id}`);
  }

  const outline = detail.sections.find((section) => section.sectionType === "outline")?.contentMd ?? "";
  const dm = detail.sections.find((section) => section.sectionType === "dm")?.contentMd ?? "";
  const outlineContent = linkifyMentions(outline, detail.roles, detail.clues);
  const dmContent = linkifyMentions(dm, detail.roles, detail.clues);

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
          {detail.script.isPublic === 1 && (
            <Link href={`/scripts/${detail.script.id}`}>
              <Button>进入公开页面</Button>
            </Link>
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
          <h3 className="font-display text-xl text-ink-900">故事大纲</h3>
          <MarkdownBlock content={outlineContent || "暂无内容"} />
        </Card>
        <Card>
          <h3 className="font-display text-xl text-ink-900">DM 手册</h3>
          <MarkdownBlock content={dmContent || "暂无内容"} />
        </Card>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <Card>
          <h3 className="font-display text-xl text-ink-900">人物剧本</h3>
          <div className="mt-4 grid gap-4">
            {detail.roles.length === 0 ? (
              <p className="text-sm text-ink-500">暂无角色</p>
            ) : (
              detail.roles.map((role) => (
                <div key={role.id} id={`role-${role.id}`} className="rounded-2xl border border-ink-100 bg-paper-50/80 p-4">
                  <h4 className="font-display text-lg text-ink-900">{role.name || "未命名角色"}</h4>
                  <MarkdownBlock content={linkifyMentions(role.contentMd, detail.roles, detail.clues)} />
                </div>
              ))
            )}
          </div>
        </Card>
        <Card>
          <h3 className="font-display text-xl text-ink-900">线索库</h3>
          <div className="mt-4 grid gap-4">
            {detail.clues.length === 0 ? (
              <p className="text-sm text-ink-500">暂无线索</p>
            ) : (
              detail.clues.map((clue) => (
                <div key={clue.id} id={`clue-${clue.id}`} className="rounded-2xl border border-ink-100 bg-paper-50/80 p-4">
                  <h4 className="font-display text-lg text-ink-900">{clue.title || "未命名线索"}</h4>
                  <MarkdownBlock content={linkifyMentions(clue.contentMd, detail.roles, detail.clues)} />
                </div>
              ))
            )}
          </div>
        </Card>
      </section>
    </div>
  );
}
