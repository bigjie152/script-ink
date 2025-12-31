import { EditorV2Client } from "@/components/editor-v2/EditorV2Client";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ScriptEditV2Page({ params }: PageProps) {
  const { id } = await params;
  return <EditorV2Client scriptId={id} />;
}
