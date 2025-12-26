import { redirect } from "next/navigation";
import { ScriptCreateForm } from "@/components/scripts/ScriptCreateForm";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "edge";

export default async function NewScriptPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login?next=/scripts/new");
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="grid gap-6">
        <div>
          <h1 className="font-display text-2xl text-ink-900">新建剧本</h1>
          <p className="mt-2 text-sm text-ink-600">创建后可在编辑器完善内容。</p>
        </div>
        <ScriptCreateForm />
      </Card>
    </div>
  );
}
