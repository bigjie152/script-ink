import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/auth";
import { getScriptDetail, getScriptVersions } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const runtime = "edge";

type VersionsPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ScriptVersionsPage({ params }: VersionsPageProps) {
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

  const versions = await getScriptVersions(id);

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-500">版本记录</p>
          <h1 className="font-display text-2xl text-ink-900">{detail.script.title}</h1>
        </div>
        <Link href={`/scripts/${id}`} className="text-sm text-ink-600 hover:text-ink-900">
          返回剧本页
        </Link>
      </div>

      {versions.length === 0 ? (
        <Card className="border-dashed border-ink-200 bg-paper-50/80 text-center text-sm text-ink-500">
          暂无版本记录，建议在编辑页填写“更新说明”。
        </Card>
      ) : (
        <div className="grid gap-4">
          {versions.map((version) => (
            <Card key={version.id} className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
                <span>{formatDate(version.createdAt)}</span>
                <span>记录人：{version.authorName}</span>
              </div>
              <p className="font-display text-lg text-ink-900">{version.summary}</p>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
