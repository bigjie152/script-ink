import Link from "next/link";
import { ScriptCard } from "@/components/scripts/ScriptCard";
import { getCommunityScripts } from "@/lib/data";

export const runtime = "edge";
export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: Promise<{ sort?: string }>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedParams = (await searchParams) ?? {};
  const sort = resolvedParams.sort === "hot" ? "hot" : "latest";
  const scripts = await getCommunityScripts(sort);

  return (
    <div className="grid gap-10">
      <section className="grid gap-6 rounded-[32px] border border-ink-100 bg-white/80 p-10">
        <div className="grid gap-4">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-500">
            Script Ink Community
          </p>
          <h1 className="font-display text-4xl text-ink-900 md:text-5xl">
            剧本杀创作者的协作工作台
          </h1>
          <p className="max-w-2xl text-sm text-ink-600">
            在这里写作、共创、Fork 与验证你的剧本。让灵感被看见，让版本有迹可循。
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href={{ pathname: "/", query: { sort: "latest" } }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              sort === "latest"
                ? "bg-ink-900 text-paper-50 shadow-sm"
                : "border border-ink-200 text-ink-700 hover:border-ink-500"
            }`}
            aria-current={sort === "latest" ? "page" : undefined}
            style={sort === "latest" ? { color: "#fdfaf5" } : undefined}
          >
            最新发布
          </Link>
          <Link
            href={{ pathname: "/", query: { sort: "hot" } }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              sort === "hot"
                ? "bg-ink-900 text-paper-50 shadow-sm"
                : "border border-ink-200 text-ink-700 hover:border-ink-500"
            }`}
            aria-current={sort === "hot" ? "page" : undefined}
            style={sort === "hot" ? { color: "#fdfaf5" } : undefined}
          >
            热门剧本
          </Link>
        </div>
      </section>

      <section className="grid gap-6">
        {scripts.length === 0 ? (
          <div className="rounded-[32px] border border-dashed border-ink-200 bg-paper-50/80 p-10 text-center text-sm text-ink-500">
            还没有公开剧本，快去创建第一个作品吧。
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {scripts.map((script) => (
              <ScriptCard
                key={script.id}
                id={script.id}
                title={script.title}
                summary={script.summary}
                authorName={script.authorName}
                createdAt={script.createdAt}
                tags={script.tags}
                rating={script.rating}
                forkCount={script.forkCount}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
