import { notFound } from "next/navigation";
import { ScriptIssuesPanel } from "@/components/scripts/ScriptIssuesPanel";
import { getCurrentUser } from "@/lib/auth";
import { getScriptDetail, getScriptIssues } from "@/lib/data";

export const runtime = "edge";

type IssuesPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ScriptIssuesPage({ params }: IssuesPageProps) {
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

  const issues = await getScriptIssues(id);

  return (
    <ScriptIssuesPanel
      scriptId={detail.script.id}
      scriptTitle={detail.script.title}
      ownerId={detail.script.authorId}
      viewer={user ? { id: user.id, displayName: user.displayName } : null}
      initialIssues={issues}
    />
  );
}
