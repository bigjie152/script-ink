import { notFound, redirect } from "next/navigation";
import { ScriptEditor } from "@/components/scripts/ScriptEditor";
import { getCurrentUser } from "@/lib/auth";
import { getScriptDetail } from "@/lib/data";

export const runtime = "edge";

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditScriptPage({ params }: EditPageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=/scripts/${id}/edit`);
  }

  const detail = await getScriptDetail(id);
  if (!detail) {
    notFound();
  }

  if (detail.script.authorId !== user.id) {
    redirect(`/scripts/${id}`);
  }

  return (
    <div className="grid gap-6">
      <div>
        <h1 className="font-display text-3xl text-ink-900">编辑剧本</h1>
        <p className="mt-2 text-sm text-ink-600">多面板协作编辑，支持 @角色 / #线索 提及。</p>
      </div>
      <ScriptEditor
        script={detail.script}
        sections={detail.sections}
        roles={detail.roles}
        clues={detail.clues}
        tags={detail.tags}
      />
    </div>
  );
}
