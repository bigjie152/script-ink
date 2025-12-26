import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getCurrentUser } from "@/lib/auth";
import { Card } from "@/components/ui/Card";

export const runtime = "edge";

type RegisterPageProps = {
  searchParams?: { next?: string };
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect(searchParams?.next || "/");
  }

  return (
    <div className="mx-auto max-w-md">
      <Card className="grid gap-6">
        <div>
          <h1 className="font-display text-2xl text-ink-900">创建一个创作者账号</h1>
          <p className="mt-2 text-sm text-ink-600">当前为内测版，资料可随意填写。</p>
        </div>
        <RegisterForm next={searchParams?.next} />
        <p className="text-xs text-ink-500">
          已有账号？
          <Link href="/login" className="ml-2 text-ink-900">
            去登录
          </Link>
        </p>
      </Card>
    </div>
  );
}
