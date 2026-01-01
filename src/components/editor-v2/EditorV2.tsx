"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import NextLink from "next/link";
import { EditorContent, useEditor } from "@tiptap/react";
import { FloatingMenu } from "@tiptap/react/menus";
import type { Editor, Extension } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";

import { Document } from "@tiptap/extension-document";
import { Text } from "@tiptap/extension-text";
import { Paragraph } from "@tiptap/extension-paragraph";
import { HardBreak } from "@tiptap/extension-hard-break";
import { TextStyle } from "@tiptap/extension-text-style";
import { ListItem } from "@tiptap/extension-list";
import { Dropcursor, Gapcursor, Placeholder, TrailingNode } from "@tiptap/extensions";

import { ActionButton, RichTextProvider } from "@editor-v2/components";
import { SlashCommand, SlashCommandList } from "@editor-v2/extensions/SlashCommand";
import type { CommandList } from "@editor-v2/extensions/SlashCommand/types";
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
import { Textarea } from "@/components/ui/Textarea";

import { EntityMention, type EntityMentionItem } from "./EntityMention";
import type { EntityType, ScriptEntity } from "./types";

const EMPTY_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

type WordToolbarComponents = {
  ImportWord?: ComponentType;
  ExportWord?: ComponentType;
};

type WordToolsState = {
  extensions: Extension[];
  toolbar: WordToolbarComponents;
};

type SaveStatus = "idle" | "saving" | "saved" | "error" | "offline";

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

type ScriptMeta = {
  title: string;
  summary: string;
  tags: string;
  isPublic: boolean;
  allowFork: boolean;
};

const filterItems = (items: EntityMentionItem[], query: string) => {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return items;
  return items.filter((item) => item.label.toLowerCase().includes(keyword));
};

type RichTextToolbarProps = {
  wordToolbar?: WordToolbarComponents;
  onSave: () => void;
  onToggleJson: () => void;
  showJson: boolean;
  saveStatus: SaveStatus;
  previewHref: string;
};

const RichTextToolbar = ({
  wordToolbar,
  onSave,
  onToggleJson,
  showJson,
  saveStatus,
  previewHref,
}: RichTextToolbarProps) => {
  const ImportWordButton = wordToolbar?.ImportWord;
  const ExportWordButton = wordToolbar?.ExportWord;
  const saveLabel = saveStatus === "saving" ? "保存中…" : "保存";

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-solid border-ink-100/70 bg-paper-50/80 px-2 py-1">
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
      {ImportWordButton && <ImportWordButton />}
      {ExportWordButton && <ExportWordButton />}
      <RichTextTextDirection />
      <RichTextAttachment />
      <RichTextKatex />
      <RichTextExcalidraw />
      <RichTextMermaid />
      <RichTextDrawer />
      <RichTextTwitter />
      <RichTextCodeView />
      <div className="ml-auto flex items-center gap-2 pl-2">
        <Button
          type="button"
          onClick={onSave}
          disabled={saveStatus === "saving"}
          className="px-3 py-1 text-xs"
        >
          {saveLabel}
        </Button>
        <NextLink href={previewHref}>
          <Button variant="outline" type="button" className="px-3 py-1 text-xs">
            预览
          </Button>
        </NextLink>
        <Button
          variant="outline"
          type="button"
          onClick={onToggleJson}
          className="px-3 py-1 text-xs"
        >
          {showJson ? "隐藏 JSON" : "查看 JSON"}
        </Button>
      </div>
    </div>
  );
};

const MinimalTextBubble = () => (
  <div className="richtext-flex richtext-items-center richtext-gap-1 richtext-rounded-md !richtext-border !richtext-border-solid !richtext-border-border richtext-bg-popover richtext-p-1 richtext-text-popover-foreground richtext-shadow-md richtext-outline-none">
    <RichTextBold />
    <RichTextItalic />
    <RichTextStrike />
    <RichTextCode />
    <RichTextLink />
  </div>
);

const EditorFloatingMenu = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;

  const shouldShow = ({ editor: currentEditor, state }: { editor: Editor; state: EditorState }) => {
    if (!currentEditor.isEditable) return false;
    if (!state.selection.empty) return false;
    const { $from } = state.selection;
    const isParagraph = $from.parent.type.name === "paragraph";
    const isEmpty = $from.parent.content.size === 0;
    return isParagraph && isEmpty;
  };

  return (
    <FloatingMenu
      editor={editor}
      shouldShow={shouldShow}
      options={{ offset: { mainAxis: 8, crossAxis: 0 }, placement: "right-start" }}
    >
      <div className="richtext-flex richtext-items-center richtext-gap-1 richtext-rounded-md !richtext-border !richtext-border-solid !richtext-border-border richtext-bg-popover richtext-p-1 richtext-text-popover-foreground richtext-shadow-md">
        <ActionButton
          icon="Heading2"
          tooltip="标题"
          action={() => editor.chain().focus().setHeading({ level: 2 }).run()}
        />
        <ActionButton
          icon="List"
          tooltip="无序列表"
          action={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ActionButton
          icon="ListOrdered"
          tooltip="有序列表"
          action={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ActionButton
          icon="Minus"
          tooltip="分隔线"
          action={() => editor.chain().focus().setHorizontalRule().run()}
        />
      </div>
    </FloatingMenu>
  );
};

const EditorV2Inner = ({
  scriptId,
  wordTools,
}: {
  scriptId: string;
  wordTools: WordToolsState;
}) => {
  const [entities, setEntities] = useState<ScriptEntity[]>([]);
  const [activeEntityId, setActiveEntityId] = useState<string | null>(null);
  const [scriptMeta, setScriptMeta] = useState<ScriptMeta>({
    title: "",
    summary: "",
    tags: "",
    isPublic: true,
    allowFork: true,
  });
  const [versionNote, setVersionNote] = useState("");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [showScriptMeta, setShowScriptMeta] = useState(false);
  const [showPropsPanel, setShowPropsPanel] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const isSwitchingRef = useRef(false);
  const activeEntityRef = useRef<ScriptEntity | null>(null);
  const initializedRef = useRef(false);
  const autoSaveIntervalRef = useRef<number | null>(null);
  const skipSaveRef = useRef(true);
  const wasOnlineRef = useRef(true);

  const roleItemsRef = useRef<EntityMentionItem[]>([]);
  const clueItemsRef = useRef<EntityMentionItem[]>([]);

  const activeEntity = useMemo(
    () => entities.find((entity) => entity.id === activeEntityId) ?? null,
    [entities, activeEntityId]
  );

  const roles = useMemo(() => entities.filter((entity) => entity.type === "role"), [entities]);
  const clues = useMemo(() => entities.filter((entity) => entity.type === "clue"), [entities]);
  const flowNodes = useMemo(() => entities.filter((entity) => entity.type === "flow_node"), [entities]);
  const slashCommandList = useMemo<CommandList[]>(
    () => [
      {
        name: "format",
        title: "格式",
        commands: [
          {
            name: "heading",
            label: "标题",
            aliases: ["h2", "bt", "biaoti"],
            iconName: "Heading2",
            action: ({ editor, range }) => {
              editor.chain().focus().deleteRange(range).setHeading({ level: 2 }).run();
            },
          },
          {
            name: "bulletList",
            label: "无序列表",
            aliases: ["ul", "list"],
            iconName: "List",
            action: ({ editor, range }) => {
              editor.chain().focus().deleteRange(range).toggleBulletList().run();
            },
          },
          {
            name: "orderedList",
            label: "有序列表",
            aliases: ["ol", "ordered"],
            iconName: "ListOrdered",
            action: ({ editor, range }) => {
              editor.chain().focus().deleteRange(range).toggleOrderedList().run();
            },
          },
          {
            name: "blockquote",
            label: "引用块",
            aliases: ["quote", "yinyong"],
            iconName: "TextQuote",
            action: ({ editor, range }) => {
              editor.chain().focus().deleteRange(range).setBlockquote().run();
            },
          },
          {
            name: "horizontalRule",
            label: "分隔线",
            aliases: ["hr", "divider"],
            iconName: "Minus",
            action: ({ editor, range }) => {
              editor.chain().focus().deleteRange(range).setHorizontalRule().run();
            },
          },
        ],
      },
      {
        name: "insert",
        title: "插入",
        commands: [
          {
            name: "mentionRole",
            label: "插入角色引用",
            aliases: ["role", "@角色"],
            iconName: "BookMarked",
            action: ({ editor, range }) => {
              editor.chain().focus().deleteRange(range).insertContent("@").run();
            },
          },
          {
            name: "mentionClue",
            label: "插入线索引用",
            aliases: ["clue", "#线索"],
            iconName: "Sparkles",
            action: ({ editor, range }) => {
              editor.chain().focus().deleteRange(range).insertContent("#").run();
            },
          },
        ],
      },
    ],
    []
  );

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
    const online = typeof navigator !== "undefined" ? navigator.onLine : true;
    setIsOnline(online);
    wasOnlineRef.current = online;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!isOnline) {
      setSaveStatus("offline");
      return;
    }
    if (saveStatus === "offline" && !isDirty) {
      setSaveStatus("idle");
    }
  }, [isOnline, isDirty, saveStatus]);

  useEffect(() => {
    activeEntityRef.current = activeEntity;
  }, [activeEntity]);

  const baseExtensions = useMemo(
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

  const extensions = useMemo(
    () => [...baseExtensions, ...wordTools.extensions],
    [baseExtensions, wordTools.extensions]
  );

  const editor = useEditor(
    {
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
    },
    [extensions]
  );

  useEffect(() => {
    let isMounted = true;
    const loadEntities = async () => {
      setLoading(true);
      setLoadMessage(null);

      try {
        const response = await fetch(`/api/scripts/${scriptId}/entities`);
        if (!response.ok) {
          const data = (await response.json().catch(() => null)) as { message?: string } | null;
          if (isMounted) {
            setLoadMessage(data?.message ?? "加载失败，请稍后重试。");
            setLoading(false);
          }
          return;
        }

        const data = (await response.json().catch(() => null)) as {
          script?: { title?: string; summary?: string | null; isPublic?: number | boolean; allowFork?: number | boolean };
          tags?: string[];
          entities?: ScriptEntity[];
        } | null;

        const normalized = (data?.entities ?? [])
          .filter((entity) => ["truth", "role", "clue", "flow_node"].includes(entity.type))
          .map((entity) => normalizeEntity(entity));
        const hasTruth = normalized.some((entity) => entity.type === "truth");
        if (!hasTruth) normalized.unshift(createEntity("truth"));

        const nextActive = normalized.find((entity) => entity.type === "truth")?.id ?? normalized[0]?.id ?? null;
        if (isMounted) {
          setEntities(normalized);
          setActiveEntityId(nextActive);
          setScriptMeta({
            title: String(data?.script?.title ?? ""),
            summary: String(data?.script?.summary ?? ""),
            tags: (data?.tags ?? []).map((tag) => `#${tag}`).join(" "),
            isPublic: Boolean(data?.script?.isPublic),
            allowFork: Boolean(data?.script?.allowFork),
          });
          setLastSavedAt(null);
          setSaveStatus("idle");
          setSaveMessage(null);
          setIsDirty(false);
          skipSaveRef.current = true;
          initializedRef.current = true;
        }
      } catch {
        if (isMounted) {
          setLoadMessage("加载失败，请稍后重试。");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadEntities();

    return () => {
      isMounted = false;
    };
  }, [scriptId]);

  const saveEntities = useCallback(
    async (mode: "auto" | "manual") => {
      const title = scriptMeta.title.trim();
      if (!title) {
        if (mode === "manual") {
          setSaveMessage("请先填写剧本标题。");
        }
        return false;
      }

      if (!isOnline) {
        setSaveStatus("offline");
        if (mode === "manual") {
          setSaveMessage("当前离线，无法保存。");
        }
        return false;
      }

      setSaveStatus("saving");
      if (mode === "manual") {
        setSaveMessage(null);
      }

      const payload = {
        script: {
          title,
          summary: scriptMeta.summary,
          tags: scriptMeta.tags,
          isPublic: scriptMeta.isPublic,
          allowFork: scriptMeta.allowFork,
        },
        entities,
        versionNote: mode === "manual" ? versionNote : "",
        mode,
      };

      let response: Response;
      try {
        response = await fetch(`/api/scripts/${scriptId}/entities`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          setSaveStatus("offline");
          if (mode === "manual") {
            setSaveMessage("当前离线，无法保存。");
          }
        } else {
          setSaveStatus("error");
          if (mode === "manual") {
            setSaveMessage("保存失败，请稍后再试。");
          }
        }
        return false;
      }

      if (!response.ok) {
        setSaveStatus("error");
        if (mode === "manual") {
          setSaveMessage("保存失败，请稍后再试。");
        }
        return false;
      }

      setSaveStatus("saved");
      setLastSavedAt(new Date().toLocaleTimeString());
      setIsDirty(false);
      if (mode === "manual") {
        setSaveMessage("已保存");
      } else {
        setSaveMessage(null);
      }
      return true;
    },
    [entities, isOnline, scriptId, scriptMeta, versionNote]
  );

  const handleManualSave = useCallback(async () => {
    const ok = await saveEntities("manual");
    if (ok) {
      setVersionNote("");
    }
  }, [saveEntities]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "s") {
        event.preventDefault();
        void handleManualSave();
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [handleManualSave]);

  useEffect(() => {
    if (loading || !initializedRef.current) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }

    setIsDirty(true);
  }, [entities, scriptMeta, loading]);

  useEffect(() => {
    if (!initializedRef.current) return;
    if (autoSaveIntervalRef.current) {
      window.clearInterval(autoSaveIntervalRef.current);
    }

    autoSaveIntervalRef.current = window.setInterval(() => {
      if (!isDirty || loading) return;
      if (!isOnline) {
        setSaveStatus("offline");
        return;
      }
      void saveEntities("auto");
    }, 180000);

    return () => {
      if (autoSaveIntervalRef.current) {
        window.clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [isDirty, isOnline, loading, saveEntities]);

  useEffect(() => {
    if (!isOnline) {
      wasOnlineRef.current = false;
      return;
    }
    if (!wasOnlineRef.current && isDirty && initializedRef.current && !loading) {
      void saveEntities("auto");
    }
    wasOnlineRef.current = true;
  }, [isOnline, isDirty, loading, saveEntities]);

  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [isDirty]);

  useEffect(() => {
    return () => {
      if (autoSaveIntervalRef.current) {
        window.clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, []);

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
    return (
      <div className="text-sm text-ink-600">
        {loadMessage ?? "编辑器加载中..."}
      </div>
    );
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
  const showRetry = isDirty && (saveStatus === "error" || saveStatus === "offline");
  const saveStatusLabel = (() => {
    if (saveStatus === "saving") return "保存中…";
    if (saveStatus === "offline") return isDirty ? "离线，等待网络恢复" : "离线";
    if (saveStatus === "error") return "保存失败";
    if (isDirty) return "未保存修改";
    if (saveStatus === "saved" && lastSavedAt) return `已保存：${lastSavedAt}`;
    return "";
  })();
  const layoutClassName = showPropsPanel
    ? "grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)_240px]"
    : "grid gap-4 lg:grid-cols-[200px_minmax(0,1fr)]";

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 rounded-3xl border border-ink-100 bg-white/80 px-3 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-ink-500">剧本信息</p>
            <h2 className="font-display text-lg text-ink-900">
              {scriptMeta.title ? scriptMeta.title : "未命名剧本"}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
              <span>{saveStatusLabel}</span>
              {showRetry && (
                <button
                  type="button"
                  className="rounded-full border border-ink-200 px-2 py-0.5 text-[11px] text-ink-700 hover:border-ink-400"
                  onClick={handleManualSave}
                >
                  点击重试
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowScriptMeta((prev) => !prev)}
              className="px-3 py-1 text-xs"
            >
              {showScriptMeta ? "收起剧本设置" : "剧本设置"}
            </Button>
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowPropsPanel((prev) => !prev)}
              className="px-3 py-1 text-xs"
            >
              {showPropsPanel ? "隐藏属性面板" : "显示属性面板"}
            </Button>
          </div>
        </div>

        {showScriptMeta && (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px]">
            <div className="grid gap-3">
              <Input
                value={scriptMeta.title}
                onChange={(event) =>
                  setScriptMeta((prev) => ({ ...prev, title: event.target.value }))
                }
                placeholder="剧本标题"
              />
              <Textarea
                rows={3}
                value={scriptMeta.summary}
                onChange={(event) =>
                  setScriptMeta((prev) => ({ ...prev, summary: event.target.value }))
                }
                placeholder="剧本简介"
              />
              <Input
                value={scriptMeta.tags}
                onChange={(event) =>
                  setScriptMeta((prev) => ({ ...prev, tags: event.target.value }))
                }
                placeholder="#古风 #密室 #情感"
              />
              <Textarea
                rows={2}
                value={versionNote}
                onChange={(event) => setVersionNote(event.target.value)}
                placeholder="更新说明（可选）"
              />
              {saveMessage && <p className="text-xs text-ink-600">{saveMessage}</p>}
            </div>

            <div className="grid gap-3 rounded-2xl border border-ink-100 bg-paper-50/60 p-3 text-sm text-ink-600">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={scriptMeta.isPublic}
                  onChange={(event) =>
                    setScriptMeta((prev) => ({ ...prev, isPublic: event.target.checked }))
                  }
                />
                公开发布
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={scriptMeta.allowFork}
                  onChange={(event) =>
                    setScriptMeta((prev) => ({ ...prev, allowFork: event.target.checked }))
                  }
                />
                允许改编
              </label>
              <div className="text-xs text-ink-500">
                每 3 分钟自动保存，离开页面会提示未保存内容。
              </div>
            </div>
          </div>
        )}
      </div>

      <div className={layoutClassName}>
        <aside className="rounded-3xl border border-ink-100 bg-paper-50/80 p-3">
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
          <div className="flex flex-wrap items-center gap-3 border-b border-ink-100/60 px-3 py-2">
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
                <RichTextToolbar
                  wordToolbar={wordTools.toolbar}
                  onSave={handleManualSave}
                  onToggleJson={() => setShowJson((prev) => !prev)}
                  showJson={showJson}
                  saveStatus={saveStatus}
                  previewHref={`/scripts/${scriptId}/preview`}
                />
                <EditorContent editor={editor} />
                <EditorFloatingMenu editor={editor} />

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
                <RichTextBubbleText buttonBubble={<MinimalTextBubble />} />
                <RichTextBubbleTwitter />
                <RichTextBubbleMenuDragHandle />
                <SlashCommandList commandList={slashCommandList} />
              </div>
            </RichTextProvider>
          )}
        </section>

        {showPropsPanel && (
          <aside className="rounded-3xl border border-ink-100 bg-paper-50/80 p-3 text-sm text-ink-700">
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
        )}
      </div>
    </div>
  );
};

export const EditorV2 = ({ scriptId }: { scriptId: string }) => {
  const [wordTools, setWordTools] = useState<WordToolsState | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadWordTools = async () => {
      try {
        const [importWordModule, exportWordModule] = await Promise.all([
          import("@editor-v2/extensions/ImportWord"),
          import("@editor-v2/extensions/ExportWord"),
        ]);
        if (!isMounted) return;
        setWordTools({
          extensions: [importWordModule.ImportWord, exportWordModule.ExportWord],
          toolbar: {
            ImportWord: importWordModule.RichTextImportWord,
            ExportWord: exportWordModule.RichTextExportWord,
          },
        });
      } catch (error) {
        console.error("Failed to load Word tools", error);
        if (isMounted) {
          setWordTools({ extensions: [], toolbar: {} });
        }
      }
    };

    loadWordTools();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!wordTools) {
    return <div className="text-sm text-ink-600">编辑器加载中...</div>;
  }

  return <EditorV2Inner scriptId={scriptId} wordTools={wordTools} />;
};
