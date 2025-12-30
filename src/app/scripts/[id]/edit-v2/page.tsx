import { EditorV2 } from "@/components/editor-v2/EditorV2";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ScriptEditV2Page({ params }: PageProps) {
  const { id } = await params;
  return <EditorV2 scriptId={id} />;
}
