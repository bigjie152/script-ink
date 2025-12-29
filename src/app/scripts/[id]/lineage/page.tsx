import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { getCurrentUser } from "@/lib/auth";
import { getScriptDetail, getScriptLineage } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export const runtime = "edge";

type LineagePageProps = {
  params: Promise<{ id: string }>;
};

type LineageNode = {
  id: string;
  title: string;
  rootId: string | null;
  parentId: string | null;
  authorId: string;
  authorName: string;
  createdAt: number;
};

const buildTree = (
  node: LineageNode,
  childrenMap: Map<string | null, LineageNode[]>,
  depth = 0
): { node: LineageNode; depth: number }[] => {
  const rows = [{ node, depth }];
  const children = childrenMap.get(node.id) ?? [];
  for (const child of children) {
    rows.push(...buildTree(child, childrenMap, depth + 1));
  }
  return rows;
};

export default async function ScriptLineagePage({ params }: LineagePageProps) {
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

  const lineage = await getScriptLineage(id);
  if (!lineage) {
    notFound();
  }

  const nodes = lineage.nodes as LineageNode[];
  const rootNode = nodes.find((node) => node.id === lineage.rootId) ?? nodes[0];
  const childrenMap = new Map<string | null, LineageNode[]>();
  for (const node of nodes) {
    const key = node.parentId ?? null;
    const list = childrenMap.get(key) ?? [];
    list.push(node);
    childrenMap.set(key, list);
  }

  const treeRows = rootNode ? buildTree(rootNode, childrenMap) : [];

  return (
    <section className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-ink-500">改编谱系</p>
          <h1 className="font-display text-2xl text-ink-900">{detail.script.title}</h1>
        </div>
        <Link href={`/scripts/${id}`} className="text-sm text-ink-600 hover:text-ink-900">
          返回剧本页
        </Link>
      </div>

      {treeRows.length === 0 ? (
        <Card className="border-dashed border-ink-200 bg-paper-50/80 text-center text-sm text-ink-500">
          暂无改编谱系。
        </Card>
      ) : (
        <div className="grid gap-3">
          {treeRows.map((row) => (
            <Card key={row.node.id} className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3" style={{ paddingLeft: row.depth * 18 }}>
                <div className="h-2 w-2 rounded-full bg-accent-500" />
                <div>
                  <Link href={`/scripts/${row.node.id}`} className="font-display text-lg text-ink-900">
                    {row.node.title}
                  </Link>
                  <p className="text-xs text-ink-500">
                    作者 {row.node.authorName} · {formatDate(row.node.createdAt)}
                  </p>
                </div>
              </div>
              <span className="text-xs text-ink-500">{row.node.id === lineage.rootId ? "源头剧本" : "改编分支"}</span>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}
