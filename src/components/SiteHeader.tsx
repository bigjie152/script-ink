"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { LogoutButton } from "@/components/auth/LogoutButton";

type HeaderUser = { id: string; displayName: string } | null;

export const SiteHeader = () => {
  const [user, setUser] = useState<HeaderUser>(null);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (!response.ok) return;
        const data = (await response.json()) as {
          user?: { id: string; displayName: string } | null;
        };
        if (!cancelled) {
          setUser(data.user ? { id: data.user.id, displayName: data.user.displayName } : null);
        }
      } catch {
        if (!cancelled) setUser(null);
      }
    };

    void loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <header className="sticky top-0 z-20 border-b border-ink-100/80 bg-paper-50/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-ink-900 text-paper-50 font-display text-lg">
            墨
          </span>
          <div>
            <p className="font-display text-lg text-ink-900">剧本墨坊</p>
            <p className="text-xs text-ink-500">Script Ink</p>
          </div>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          <Link href="/" className="text-ink-600 hover:text-ink-900">
            社区广场
          </Link>
          {user ? (
            <>
              <Link href="/scripts/new">
                <Button>新建剧本</Button>
              </Link>
              <div className="rounded-full bg-paper-100 px-3 py-1 text-xs text-ink-600">
                {user.displayName}
              </div>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="text-ink-600 hover:text-ink-900">
                登录
              </Link>
              <Link href="/register">
                <Button>注册</Button>
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
