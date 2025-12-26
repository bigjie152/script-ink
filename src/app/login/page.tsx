import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/Card";

export const runtime = "edge";

type LoginPageProps = {
  searchParams?: Promise<{ next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  const resolvedParams = (await searchParams) ?? {};
  if (user) {
    redirect(resolvedParams.next || "/");
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="grid gap-6">
        <div>
          <h1 className="font-display text-2xl text-ink-900">欢迎回来</h1>
          <p className="mt-2 text-sm text-ink-600">使用用户名和密码登录。</p>
        </div>
        <LoginForm next={resolvedParams.next} />
        <p className="text-xs text-ink-500">
          还没有账号？
          <Link href="/register" className="ml-2 text-ink-900">
            去注册
          </Link>
        </p>
      </Card>
    </div>
  );
}
