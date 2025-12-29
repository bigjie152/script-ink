import { notFound } from "next/navigation";
import { ScriptMergePanel } from "@/components/scripts/ScriptMergePanel";
import { getCurrentUser } from "@/lib/auth";
import { getMergeCandidates, getScriptDetail, getScriptMergeRequests } from "@/lib/data";

export const runtime = "edge";

type MergePageProps = {
  params: Promise<{ id: string }>;
};

export default async function ScriptMergePage({ params }: MergePageProps) {
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

  const requests = await getScriptMergeRequests(id);
  const candidates = user ? await getMergeCandidates(user.id, id) : [];

  return (
    <ScriptMergePanel
      scriptId={detail.script.id}
      scriptTitle={detail.script.title}
      viewer={user ? { id: user.id, displayName: user.displayName } : null}
      isOwner={Boolean(isOwner)}
      initialRequests={requests}
      candidates={candidates}
    />
  );
}
