"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";

import { Document } from "@tiptap/extension-document";
import { Text } from "@tiptap/extension-text";
import { Paragraph } from "@tiptap/extension-paragraph";
import { HardBreak } from "@tiptap/extension-hard-break";
import { TextStyle } from "@tiptap/extension-text-style";
import { ListItem } from "@tiptap/extension-list";
import { Dropcursor, Gapcursor, Placeholder, TrailingNode } from "@tiptap/extensions";

import { RichTextProvider } from "@editor-v2/components";
import { SlashCommand, SlashCommandList } from "@editor-v2/extensions/SlashCommand";
import { History, RichTextRedo, RichTextUndo } from "@editor-v2/extensions/History";
import { SearchAndReplace, RichTextSearchAndReplace } from "@editor-v2/extensions/SearchAndReplace";
import { Clear, RichTextClear } from "@editor-v2/extensions/Clear";
import { FontFamily, RichTextFontFamily } from "@editor-v2/extensions/FontFamily";
import { Heading, RichTextHeading } from "@editor-v2/extensions/Heading";
import { FontSize, RichTextFontSize } from "@editor-v2/extensions/FontSize";
import { Bold, RichTextBold } from "@editor-v2/extensions/Bold";
import { Italic, RichTextItalic } from "@editor-v2/extensions/Italic";
import { TextUnderline, RichTextUnderline } from "@editor-v2/extensions/TextUnderline";
import { Strike, RichTextStrike } from "@editor-v2/extensions/Strike";
import { MoreMark, RichTextMoreMark } from "@editor-v2/extensions/MoreMark";
import { Emoji, RichTextEmoji } from "@editor-v2/extensions/Emoji";
import { Color, RichTextColor } from "@editor-v2/extensions/Color";
import { Highlight, RichTextHighlight } from "@editor-v2/extensions/Highlight";
import { BulletList, RichTextBulletList } from "@editor-v2/extensions/BulletList";
import { OrderedList, RichTextOrderedList } from "@editor-v2/extensions/OrderedList";
import { TextAlign, RichTextAlign } from "@editor-v2/extensions/TextAlign";
import { Indent, RichTextIndent } from "@editor-v2/extensions/Indent";
import { LineHeight, RichTextLineHeight } from "@editor-v2/extensions/LineHeight";
import { TaskList, RichTextTaskList } from "@editor-v2/extensions/TaskList";
import { Link, RichTextLink } from "@editor-v2/extensions/Link";
import { Image, RichTextImage } from "@editor-v2/extensions/Image";
import { Video, RichTextVideo } from "@editor-v2/extensions/Video";
import { ImageGif, RichTextImageGif } from "@editor-v2/extensions/ImageGif";
import { Blockquote, RichTextBlockquote } from "@editor-v2/extensions/Blockquote";
import { HorizontalRule, RichTextHorizontalRule } from "@editor-v2/extensions/HorizontalRule";
import { Code, RichTextCode } from "@editor-v2/extensions/Code";
import { CodeBlock, RichTextCodeBlock } from "@editor-v2/extensions/CodeBlock";
import { Column, ColumnNode, MultipleColumnNode, RichTextColumn } from "@editor-v2/extensions/Column";
import { Table, RichTextTable } from "@editor-v2/extensions/Table";
import { Iframe, RichTextIframe } from "@editor-v2/extensions/Iframe";
import { ExportPdf, RichTextExportPdf } from "@editor-v2/extensions/ExportPdf";
import { ImportWord, RichTextImportWord } from "@editor-v2/extensions/ImportWord";
import { ExportWord, RichTextExportWord } from "@editor-v2/extensions/ExportWord";
import { TextDirection, RichTextTextDirection } from "@editor-v2/extensions/TextDirection";
import { Attachment, RichTextAttachment } from "@editor-v2/extensions/Attachment";
import { Katex, RichTextKatex } from "@editor-v2/extensions/Katex";
import { Excalidraw, RichTextExcalidraw } from "@editor-v2/extensions/Excalidraw";
import { Mermaid, RichTextMermaid } from "@editor-v2/extensions/Mermaid";
import { Drawer, RichTextDrawer } from "@editor-v2/extensions/Drawer";
import { Twitter, RichTextTwitter } from "@editor-v2/extensions/Twitter";
import { CodeView, RichTextCodeView } from "@editor-v2/extensions/CodeView";
import {
  RichTextBubbleColumns,
  RichTextBubbleDrawer,
  RichTextBubbleExcalidraw,
  RichTextBubbleIframe,
  RichTextBubbleKatex,
  RichTextBubbleLink,
  RichTextBubbleImage,
  RichTextBubbleVideo,
  RichTextBubbleImageGif,
  RichTextBubbleMermaid,
  RichTextBubbleTable,
  RichTextBubbleText,
  RichTextBubbleTwitter,
  RichTextBubbleMenuDragHandle,
} from "@editor-v2/components/Bubble";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

import { EntityMention, type EntityMentionItem } from "./EntityMention";
import type { EntityType, ScriptEntity, ScriptEntityStore } from "./types";

const STORAGE_VERSION = 1;
const STORAGE_PREFIX = "script:editor-v2";

const EMPTY_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

const ENTITY_LABELS: Record<EntityType, string> = {
  truth: "真相",
  role: "角色",
  clue: "线索",
  flow_node: "流程节点",
};

const DEFAULT_TITLES: Record<EntityType, string> = {
  truth: "真相",
  role: "新角色",
  clue: "新线索",
  flow_node: "新流程节点",
};

const ROLE_SECRET_LEVELS = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" },
];

const CLUE_TYPES = [
  { value: "物证", label: "物证" },
  { value: "文书", label: "文书" },
  { value: "口供", label: "口供" },
  { value: "数字记录", label: "数字记录" },
  { value: "场景", label: "场景" },
  { value: "传闻", label: "传闻" },
];

const FLOW_PHASES = [
  { value: "开场", label: "开场" },
  { value: "搜证", label: "搜证" },
  { value: "讨论", label: "讨论" },
  { value: "投票", label: "投票" },
  { value: "复盘", label: "复盘" },
  { value: "自由阶段", label: "自由阶段" },
];

const createEntity = (type: EntityType): ScriptEntity => {
  const base = {
    id: crypto.randomUUID(),
    type,
    title: DEFAULT_TITLES[type],
    content: EMPTY_DOC,
    props: {},
  };

  if (type === "truth") {
    return { ...base, props: { isLocked: false } };
  }
  if (type === "role") {
    return { ...base, props: { secretLevel: "medium", isMurderer: false, tags: [] } };
  }
  if (type === "clue") {
    return { ...base, props: { clueType: "物证", isHidden: false, targetId: "" } };
  }
  return { ...base, props: { phase: "开场", durationMinutes: 15, clueIds: [] } };
};

const normalizeEntity = (entity: ScriptEntity): ScriptEntity => {
  const content = entity.content && typeof entity.content === "object" ? entity.content : EMPTY_DOC;
  const props = entity.props && typeof entity.props === "object" ? entity.props : {};

  return {
    id: entity.id,
    type: entity.type,
    title: entity.title || DEFAULT_TITLES[entity.type],
    content,
    props,
  };
};

const getStorageKey = (scriptId: string) => `${STORAGE_PREFIX}:${scriptId}`;

const filterItems = (items: EntityMentionItem[], query: string) => {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return items;
  return items.filter((item) => item.label.toLowerCase().includes(keyword));
};

const RichTextToolbar = () => {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-solid border-ink-100/70 bg-paper-50/80 px-2 py-2">
      <RichTextUndo />
      <RichTextRedo />
      <RichTextSearchAndReplace />
      <RichTextClear />
      <RichTextFontFamily />
      <RichTextHeading />
      <RichTextFontSize />
      <RichTextBold />
      <RichTextItalic />
      <RichTextUnderline />
      <RichTextStrike />
      <RichTextMoreMark />
      <RichTextEmoji />
      <RichTextColor />
      <RichTextHighlight />
      <RichTextBulletList />
      <RichTextOrderedList />
      <RichTextAlign />
      <RichTextIndent />
      <RichTextLineHeight />
      <RichTextTaskList />
      <RichTextLink />
      <RichTextImage />
      <RichTextVideo />
      <RichTextImageGif />
      <RichTextBlockquote />
      <RichTextHorizontalRule />
      <RichTextCode />
      <RichTextCodeBlock />
      <RichTextColumn />
      <RichTextTable />
      <RichTextIframe />
      <RichTextExportPdf />
      <RichTextImportWord />
      <RichTextExportWord />
      <RichTextTextDirection />
      <RichTextAttachment />
      <RichTextKatex />
      <RichTextExcalidraw />
      <RichTextMermaid />
      <RichTextDrawer />
      <RichTextTwitter />
      <RichTextCodeView />
    </div>
  );
};

export const EditorV2 = ({ scriptId }: { scriptId: string }) => {
  const [entities, setEntities] = useState<ScriptEntity[]>([]);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [showJson, setShowJson] = useState(false);
  const [loading, setLoading] = useState(true);
  const isSwitchingRef = useRef(false);
  const activeEntityRef = useRef<ScriptEntity | null>(null);

  const roleItemsRef = useRef<EntityMentionItem[]>([]);
  const clueItemsRef = useRef<EntityMentionItem[]>([]);

  const activeEntity = useMemo(
    () => entities.find((entity) => entity.id === activeEntityId) ?? null,
    [entities, activeEntityId]
  );

  const roles = useMemo(() => entities.filter((entity) => entity.type === "role"), [entities]);
  const clues = useMemo(() => entities.filter((entity) => entity.type === "clue"), [entities]);
  const flowNodes = useMemo(() => entities.filter((entity) => entity.type === "flow_node"), [entities]);

  useEffect(() => {
    roleItemsRef.current = roles.map((role) => ({
      id: role.id,
      label: role.title || "未命名角色",
      entityId: role.id,
      entityType: "role",
    }));
    clueItemsRef.current = clues.map((clue) => ({
      id: clue.id,
      label: clue.title || "未命名线索",
      entityId: clue.id,
      entityType: "clue",
    }));
  }, [roles, clues]);

  useEffect(() => {
    activeEntityRef.current = activeEntity;
  }, [activeEntity]);

  const extensions = useMemo(
    () => [
      Document.extend({ content: "(block|columns)+" }),
      Text,
      Dropcursor.configure({
        class: "reactjs-tiptap-editor-theme",
        color: "hsl(var(--primary))",
        width: 2,
      }),
      Gapcursor,
      HardBreak,
      Paragraph,
      TrailingNode,
      ListItem,
      TextStyle,
      Placeholder.configure({
        placeholder: "输入 / 打开命令，@ 角色，# 线索",
      }),
      History,
      SearchAndReplace,
      Clear,
      FontFamily,
      Heading,
      FontSize,
      Bold,
      Italic,
      TextUnderline,
      Strike,
      MoreMark,
      Emoji,
      Color,
      Highlight,
      BulletList,
      OrderedList,
      TextAlign,
      Indent,
      LineHeight,
      TaskList,
      Link,
      Image.configure({
        upload: (file: File) =>
          new Promise((resolve) => {
            setTimeout(() => resolve(URL.createObjectURL(file)), 300);
          }),
      }),
      Video.configure({
        upload: (file: File) =>
          new Promise((resolve) => {
            setTimeout(() => resolve(URL.createObjectURL(file)), 300);
          }),
      }),
      ImageGif.configure({
        provider: "giphy",
        API_KEY: process.env.NEXT_PUBLIC_GIPHY_API_KEY ?? "",
      }),
      Blockquote,
      HorizontalRule,
      Code,
      CodeBlock,
      Column,
      ColumnNode,
      MultipleColumnNode,
      Table,
      Iframe,
      ExportPdf,
      ImportWord,
      ExportWord,
      TextDirection,
      Attachment.configure({
        upload: (file: File) =>
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
          }),
      }),
      Katex,
      Excalidraw,
      Mermaid,
      Drawer,
      Twitter,
      EntityMention.configure({
        suggestions: [
          {
            char: "@",
            items: ({ query }: { query: string }) => filterItems(roleItemsRef.current, query),
          },
          {
            char: "#",
            items: ({ query }: { query: string }) => filterItems(clueItemsRef.current, query),
          },
        ],
      }),
      SlashCommand,
      CodeView,
    ],
    []
  );

  const editor = useEditor({
    extensions,
    content: EMPTY_DOC,
    editorProps: {
      attributes: {
        class: "min-h-[520px] px-4 py-4 focus:outline-none",
      },
    },
    onUpdate: ({ editor }) => {
      const current = activeEntityRef.current;
      if (!current || isSwitchingRef.current) return;
      const content = editor.getJSON();
      setEntities((prev) =>
        prev.map((entity) => (entity.id === current.id ? { ...entity, content } : entity))
      );
    },
  });

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem(getStorageKey(scriptId)) : null;
    if (!stored) {
      const truth = createEntity("truth");
      const next = [truth];
      setEntities(next);
      setActiveEntityId(truth.id);
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(stored) as ScriptEntityStore;
      if (!parsed?.entities?.length) {
        throw new Error("empty");
      }
      const normalized = parsed.entities
        .filter((entity) => ["truth", "role", "clue", "flow_node"].includes(entity.type))
        .map((entity) => normalizeEntity(entity));
      const hasTruth = normalized.some((entity) => entity.type === "truth");
      if (!hasTruth) normalized.unshift(createEntity("truth"));
      const nextActive = parsed.activeEntityId ?? normalized[0]?.id;
      setEntities(normalized);
      setActiveEntityId(nextActive ?? normalized[0]?.id ?? null);
    } catch {
      const truth = createEntity("truth");
      setEntities([truth]);
      setActiveEntityId(truth.id);
    }
    setLoading(false);
  }, [scriptId]);

  useEffect(() => {
    if (loading) return;
    const payload: ScriptEntityStore = {
      version: STORAGE_VERSION,
      entities,
      activeEntityId: activeEntityId ?? undefined,
    };
    localStorage.setItem(getStorageKey(scriptId), JSON.stringify(payload));
    setLastSavedAt(new Date().toLocaleTimeString());
  }, [entities, activeEntityId, scriptId, loading]);

  useEffect(() => {
    if (!editor || !activeEntity) return;
    isSwitchingRef.current = true;
    editor.commands.setContent(activeEntity.content ?? EMPTY_DOC, { emitUpdate: false });
    editor.commands.focus("end");
    isSwitchingRef.current = false;
  }, [editor, activeEntity]);

  const addEntity = (type: EntityType) => {
    const newEntity = createEntity(type);
    setEntities((prev) => [...prev, newEntity]);
    setActiveEntityId(newEntity.id);
  };

  const removeEntity = (id: string) => {
    setEntities((prev) => prev.filter((entity) => entity.id !== id));
    if (activeEntityId === id) {
      const next = entities.find((entity) => entity.id !== id);
      setActiveEntityId(next?.id ?? null);
    }
  };

  const updateEntityTitle = (id: string, title: string) => {
    setEntities((prev) =>
      prev.map((entity) => (entity.id === id ? { ...entity, title } : entity))
    );
  };

  const updateEntityProps = useCallback((id: string, patch: Record<string, unknown>) => {
    setEntities((prev) =>
      prev.map((entity) =>
        entity.id === id ? { ...entity, props: { ...entity.props, ...patch } } : entity
      )
    );
  }, []);

  const selectEntity = (id: string) => {
    if (editor && activeEntity) {
      const content = editor.getJSON();
      setEntities((prev) =>
        prev.map((entity) => (entity.id === activeEntity.id ? { ...entity, content } : entity))
      );
    }
    setActiveEntityId(id);
  };

  if (loading || !activeEntity) {
    return <div className="text-sm text-ink-600">编辑器加载中...</div>;
  }

  const truthProps = activeEntity.type === "truth" ? activeEntity.props : null;
  const roleProps = activeEntity.type === "role" ? activeEntity.props : null;
  const clueProps = activeEntity.type === "clue" ? activeEntity.props : null;
  const flowProps = activeEntity.type === "flow_node" ? activeEntity.props : null;

  const tagValue =
    activeEntity.type === "role" ? (roleProps?.tags as string[] | undefined)?.join(" ") ?? "" : "";

  const flowClueIds =
    activeEntity.type === "flow_node"
      ? (flowProps?.clueIds as string[] | undefined)?.join(", ") ?? ""
      : "";

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-ink-100 bg-white/80 px-4 py-3">
        <div className="text-sm text-ink-600">
          当前剧本：<span className="font-semibold text-ink-900">{scriptId}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-ink-500">
          {lastSavedAt && <span>已自动保存：{lastSavedAt}</span>}
          <Button variant="outline" type="button" onClick={() => setShowJson((prev) => !prev)}>
            {showJson ? "隐藏 JSON" : "查看 JSON"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
        <aside className="rounded-3xl border border-ink-100 bg-paper-50/80 p-4">
          <div className="flex items-center justify-between text-sm font-semibold text-ink-900">
            实体导航
          </div>

          <div className="mt-4 grid gap-4 text-sm">
            <div className="grid gap-2">
              <div className="flex items-center justify-between text-xs text-ink-500">
                <span>{ENTITY_LABELS.truth}</span>
              </div>
              {entities
                .filter((entity) => entity.type === "truth")
                .map((entity) => (
                  <button
                    key={entity.id}
                    type="button"
                    onClick={() => selectEntity(entity.id)}
                    className={`w-full rounded-2xl px-3 py-2 text-left text-sm transition ${
                      activeEntityId === entity.id
                        ? "bg-ink-900 text-paper-50"
                        : "border border-ink-200 text-ink-700 hover:border-ink-400"
                    }`}
                  >
                    {entity.title || ENTITY_LABELS.truth}
                  </button>
                ))}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between text-xs text-ink-500">
                <span>{ENTITY_LABELS.role}（{roles.length}）</span>
                <button
                  type="button"
                  className="rounded-full border border-dashed border-ink-300 px-2 py-1 text-[10px] text-ink-600"
                  onClick={() => addEntity("role")}
                >
                  + 新角色
                </button>
              </div>
              {roles.map((entity) => (
                <div key={entity.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => selectEntity(entity.id)}
                    className={`flex-1 rounded-2xl px-3 py-2 text-left text-sm transition ${
                      activeEntityId === entity.id
                        ? "bg-ink-900 text-paper-50"
                        : "border border-ink-200 text-ink-700 hover:border-ink-400"
                    }`}
                  >
                    {entity.title || DEFAULT_TITLES.role}
                  </button>
                  <button
                    type="button"
                    className="text-[10px] text-ink-400 hover:text-ink-700"
                    onClick={() => removeEntity(entity.id)}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between text-xs text-ink-500">
                <span>{ENTITY_LABELS.clue}（{clues.length}）</span>
                <button
                  type="button"
                  className="rounded-full border border-dashed border-ink-300 px-2 py-1 text-[10px] text-ink-600"
                  onClick={() => addEntity("clue")}
                >
                  + 新线索
                </button>
              </div>
              {clues.map((entity) => (
                <div key={entity.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => selectEntity(entity.id)}
                    className={`flex-1 rounded-2xl px-3 py-2 text-left text-sm transition ${
                      activeEntityId === entity.id
                        ? "bg-ink-900 text-paper-50"
                        : "border border-ink-200 text-ink-700 hover:border-ink-400"
                    }`}
                  >
                    {entity.title || DEFAULT_TITLES.clue}
                  </button>
                  <button
                    type="button"
                    className="text-[10px] text-ink-400 hover:text-ink-700"
                    onClick={() => removeEntity(entity.id)}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between text-xs text-ink-500">
                <span>{ENTITY_LABELS.flow_node}（{flowNodes.length}）</span>
                <button
                  type="button"
                  className="rounded-full border border-dashed border-ink-300 px-2 py-1 text-[10px] text-ink-600"
                  onClick={() => addEntity("flow_node")}
                >
                  + 新节点
                </button>
              </div>
              {flowNodes.map((entity) => (
                <div key={entity.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => selectEntity(entity.id)}
                    className={`flex-1 rounded-2xl px-3 py-2 text-left text-sm transition ${
                      activeEntityId === entity.id
                        ? "bg-ink-900 text-paper-50"
                        : "border border-ink-200 text-ink-700 hover:border-ink-400"
                    }`}
                  >
                    {entity.title || DEFAULT_TITLES.flow_node}
                  </button>
                  <button
                    type="button"
                    className="text-[10px] text-ink-400 hover:text-ink-700"
                    onClick={() => removeEntity(entity.id)}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>
        </aside>

        <section className="rounded-3xl border border-ink-100 bg-white/80">
          <div className="flex flex-wrap items-center gap-3 border-b border-ink-100/60 px-4 py-3">
            <span className="rounded-full bg-ink-900 px-3 py-1 text-xs text-paper-50">
              {ENTITY_LABELS[activeEntity.type]}
            </span>
            <Input
              value={activeEntity.title}
              onChange={(event) => updateEntityTitle(activeEntity.id, event.target.value)}
              placeholder="输入标题"
              className="max-w-sm"
            />
          </div>

          {editor && (
            <RichTextProvider editor={editor}>
              <div className="flex max-h-full w-full flex-col">
                <RichTextToolbar />
                <EditorContent editor={editor} />

                <RichTextBubbleColumns />
                <RichTextBubbleDrawer />
                <RichTextBubbleExcalidraw />
                <RichTextBubbleIframe />
                <RichTextBubbleKatex />
                <RichTextBubbleLink />
                <RichTextBubbleImage />
                <RichTextBubbleVideo />
                <RichTextBubbleImageGif />
                <RichTextBubbleMermaid />
                <RichTextBubbleTable />
                <RichTextBubbleText />
                <RichTextBubbleTwitter />
                <RichTextBubbleMenuDragHandle />
                <SlashCommandList />
              </div>
            </RichTextProvider>
          )}
        </section>

        <aside className="rounded-3xl border border-ink-100 bg-paper-50/80 p-4 text-sm text-ink-700">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-ink-900">属性面板</span>
          </div>

          {activeEntity.type === "truth" && (
            <div className="mt-4 grid gap-3">
              <label className="flex items-center gap-2 text-xs text-ink-600">
                <input
                  type="checkbox"
                  checked={Boolean(truthProps?.isLocked)}
                  onChange={(event) =>
                    updateEntityProps(activeEntity.id, { isLocked: event.target.checked })
                  }
                />
                真相锁定
              </label>
              <p className="text-xs text-ink-500">
                状态：{truthProps?.isLocked ? "已锁定" : "未锁定"}
              </p>
            </div>
          )}

          {activeEntity.type === "role" && (
            <div className="mt-4 grid gap-3">
              <label className="text-xs text-ink-600">
                秘密等级
                <Select
                  value={String(roleProps?.secretLevel ?? "medium")}
                  onChange={(event) =>
                    updateEntityProps(activeEntity.id, { secretLevel: event.target.value })
                  }
                >
                  {ROLE_SECRET_LEVELS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-600">
                <input
                  type="checkbox"
                  checked={Boolean(roleProps?.isMurderer)}
                  onChange={(event) =>
                    updateEntityProps(activeEntity.id, { isMurderer: event.target.checked })
                  }
                />
                是否凶手
              </label>
              <label className="text-xs text-ink-600">
                角色标签
                <Input
                  value={tagValue}
                  onChange={(event) =>
                    updateEntityProps(activeEntity.id, {
                      tags: event.target.value.split(/\s+/).filter(Boolean),
                    })
                  }
                  placeholder="用空格分隔"
                />
              </label>
            </div>
          )}

          {activeEntity.type === "clue" && (
            <div className="mt-4 grid gap-3">
              <label className="text-xs text-ink-600">
                线索类型
                <Select
                  value={String(clueProps?.clueType ?? "物证")}
                  onChange={(event) =>
                    updateEntityProps(activeEntity.id, { clueType: event.target.value })
                  }
                >
                  {CLUE_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-600">
                <input
                  type="checkbox"
                  checked={Boolean(clueProps?.isHidden)}
                  onChange={(event) =>
                    updateEntityProps(activeEntity.id, { isHidden: event.target.checked })
                  }
                />
                是否隐藏
              </label>
              <label className="text-xs text-ink-600">
                指向对象
                <Select
                  value={String(clueProps?.targetId ?? "")}
                  onChange={(event) =>
                    updateEntityProps(activeEntity.id, { targetId: event.target.value })
                  }
                >
                  <option value="">未指定</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.title || DEFAULT_TITLES.role}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
          )}

          {activeEntity.type === "flow_node" && (
            <div className="mt-4 grid gap-3">
              <label className="text-xs text-ink-600">
                阶段
                <Select
                  value={String(flowProps?.phase ?? "开场")}
                  onChange={(event) =>
                    updateEntityProps(activeEntity.id, { phase: event.target.value })
                  }
                >
                  {FLOW_PHASES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="text-xs text-ink-600">
                时长（分钟）
                <Input
                  type="number"
                  min={1}
                  value={String(flowProps?.durationMinutes ?? 15)}
                  onChange={(event) =>
                    updateEntityProps(activeEntity.id, {
                      durationMinutes: Number(event.target.value || 0),
                    })
                  }
                />
              </label>
              <label className="text-xs text-ink-600">
                投放线索 ID
                <Input
                  value={flowClueIds}
                  onChange={(event) =>
                    updateEntityProps(activeEntity.id, {
                      clueIds: event.target.value
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="用英文逗号分隔"
                />
              </label>
            </div>
          )}

          {showJson && (
            <div className="mt-4 rounded-2xl border border-ink-100 bg-white/80 p-3">
              <p className="text-[10px] uppercase tracking-[0.2em] text-ink-500">JSON</p>
              <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words text-[11px] text-ink-700">
                {JSON.stringify(activeEntity.content, null, 2)}
              </pre>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
