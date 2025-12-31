import { redirect } from "next/navigation";

export const runtime = "edge";

type EditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditScriptPage({ params }: EditPageProps) {
  const { id } = await params;
  redirect(`/scripts/${id}/edit-v2`);
}
