import type { JSONContent } from "@tiptap/core";

type JsonNode = JSONContent & {
  text?: string;
  attrs?: Record<string, unknown>;
  content?: JsonNode[];
};

const renderNodes = (nodes?: JsonNode[]) => nodes?.map(renderNode).join("") ?? "";

const renderMention = (attrs?: Record<string, unknown>) => {
  const entityType = typeof attrs?.entityType === "string" ? attrs.entityType : "";
  const label = typeof attrs?.label === "string" ? attrs.label : "";
  const prefix = entityType === "clue" ? "#" : "@";
  return `${prefix}${label}`;
};

const renderNode = (node?: JsonNode): string => {
  if (!node) return "";

  if (node.type === "text") {
    return node.text ?? "";
  }

  if (node.type === "hardBreak") {
    return "\n";
  }

  if (node.type === "entity_mention") {
    return renderMention(node.attrs);
  }

  const inner = renderNodes(node.content);

  if (node.type === "paragraph" || node.type === "heading") {
    return inner ? `${inner}\n\n` : "";
  }

  if (node.type === "listItem") {
    return inner ? `- ${inner}\n` : "";
  }

  if (node.type === "bulletList" || node.type === "orderedList") {
    return inner ? `${inner}\n` : "";
  }

  if (node.type === "blockquote") {
    const lines = inner.split("\n").map((line) => (line ? `> ${line}` : line));
    return `${lines.join("\n")}\n\n`;
  }

  return inner;
};

export const renderDocText = (doc?: JSONContent) => {
  const raw = renderNode((doc ?? { type: "doc", content: [] }) as JsonNode);
  return raw.replace(/\n{3,}/g, "\n\n").trim();
};
