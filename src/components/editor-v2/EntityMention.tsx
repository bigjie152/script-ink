import { mergeAttributes, Node } from "@tiptap/core";
import type { MouseEvent } from "react";
import { PluginKey } from "@tiptap/pm/state";
import { Suggestion } from "@tiptap/suggestion";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import type { ReactNodeViewProps } from "@tiptap/react";
import { NodeViewWrapper, ReactNodeViewRenderer, ReactRenderer } from "@tiptap/react";

import { NodeViewMentionList } from "@editor-v2/extensions/Mention/components/NodeViewMentionList";
import { updatePosition } from "@editor-v2/utils/updatePosition";

import type { EntityType } from "./types";

export type EntityMentionItem = {
  id: string;
  label: string;
  entityId: string;
  entityType: EntityType;
  meta?: string;
};

type EntityMentionSuggestion = {
  char: string;
  items: (params: { query: string }) => EntityMentionItem[];
};

type ResolvedMention = {
  id: string;
  title: string;
  entityType: EntityType;
  meta?: string;
  summary?: string;
};

const MentionChip = (props: ReactNodeViewProps) => {
  const { node, extension } = props;
  const attrs = node.attrs as {
    entityId: string;
    entityType: EntityType;
    label: string;
  };
  const extensionOptions = extension.options as {
    resolveEntity?: (entityId: string) => ResolvedMention | null;
    onOpenEntity?: (entityId: string) => void;
  };
  const resolved = extensionOptions.resolveEntity?.(attrs.entityId) ?? null;
  const label = attrs.label || resolved?.title || "???";
  const prefix = attrs.entityType === "clue" ? "#" : "@";
  const handleOpen = (event: MouseEvent) => {
    event.preventDefault();
    extensionOptions.onOpenEntity?.(attrs.entityId);
  };

  return (
    <NodeViewWrapper
      as="span"
      className="entity-mention-chip"
      data-entity-id={attrs.entityId}
      data-entity-type={attrs.entityType}
      onClick={handleOpen}
    >
      <span className="entity-mention-prefix">{prefix}</span>
      <span className="entity-mention-text">{label}</span>
      {resolved?.meta && <span className="entity-mention-meta">{resolved.meta}</span>}
      {resolved && (
        <span className="entity-mention-preview" role="tooltip">
          <span className="entity-mention-preview-title">
            {resolved.entityType === "clue" ? "??" : "??"} ? {resolved.title}
          </span>
          {resolved.meta && <span className="entity-mention-preview-meta">{resolved.meta}</span>}
          {resolved.summary && (
            <span className="entity-mention-preview-summary">{resolved.summary}</span>
          )}
          <span className="entity-mention-preview-hint">???????????</span>
        </span>
      )}
    </NodeViewWrapper>
  );
};

const renderList = () => {
  let reactRenderer: ReactRenderer | null = null;
  let lastProps: SuggestionProps<EntityMentionItem, EntityMentionItem> | null = null;

  const destroy = () => {
    if (!reactRenderer) return;
    try {
      reactRenderer.destroy();
    } catch {
      // Ignore teardown errors.
    }
    if (reactRenderer.element?.isConnected) {
      reactRenderer.element.remove();
    }
    reactRenderer = null;
  };
  const closeNow = () => {
    destroy();
  };

  const getTriggerPos = () => {
    const rangeFrom = lastProps?.range?.from ?? -1;
    return rangeFrom > 0 ? rangeFrom - 1 : -1;
  };

  const hasTrigger = () => {
    if (!lastProps?.editor) return false;
    const triggerPos = getTriggerPos();
    if (triggerPos < 0) return false;
    const triggerChar = lastProps.editor.state.doc.textBetween(triggerPos, triggerPos + 1, "\0", "\0");
    return triggerChar === "@" || triggerChar === "#";
  };

  const shouldHoldMenu = () => {
    if (!lastProps?.editor?.isFocused) {
      return false;
    }
    const { state } = lastProps.editor;
    if (!hasTrigger()) return false;
    const triggerPos = getTriggerPos();
    const selectionPos = state.selection.from;
    return selectionPos >= triggerPos && selectionPos <= lastProps.range.to;
  };

  const shouldCloseImmediately = () => {
    if (!lastProps?.editor?.isFocused) {
      return true;
    }
    return !hasTrigger();
  };

  return {
    onStart: (props: SuggestionProps<EntityMentionItem, EntityMentionItem>) => {
      if (!props.clientRect) return;

      lastProps = props;

      reactRenderer = new ReactRenderer(NodeViewMentionList, {
        props,
        editor: props.editor,
      });

      reactRenderer.element.style.position = "absolute";
      document.body.appendChild(reactRenderer.element);
      updatePosition(props.editor, reactRenderer.element, props.clientRect);
    },
    onUpdate(props: SuggestionProps<EntityMentionItem, EntityMentionItem>) {
      if (!reactRenderer) return;
      lastProps = props;
      reactRenderer.updateProps(props);
      if (!props.clientRect) return;
      updatePosition(props.editor, reactRenderer.element, props.clientRect);
    },
    onKeyDown(props: SuggestionKeyDownProps) {
      if (props.event.key === "Escape") {
        closeNow();
        return true;
      }
      const handler = (reactRenderer?.ref as { onKeyDown?: (args: SuggestionKeyDownProps) => boolean })
        ?.onKeyDown;
      return handler ? handler(props) : false;
    },
    onExit() {
      if (!reactRenderer) return;
      if (shouldHoldMenu()) {
        return;
      }
      if (shouldCloseImmediately()) {
        destroy();
        return;
      }
      destroy();
    },
    closeNow,
  };
};

export const EntityMention = Node.create({
  name: "entity_mention",
  inline: true,
  group: "inline",
  selectable: false,
  atom: true,

  addOptions() {
    return {
      suggestions: [] as EntityMentionSuggestion[],
      resolveEntity: undefined as ((entityId: string) => ResolvedMention | null) | undefined,
      onOpenEntity: undefined as ((entityId: string) => void) | undefined,
      HTMLAttributes: {
        class: "entity-mention",
      },
    };
  },

  addAttributes() {
    return {
      entityId: {
        default: null,
      },
      entityType: {
        default: null,
      },
      label: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-entity-id]" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const prefix = node.attrs.entityType === "clue" ? "#" : "@";
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": "mention",
        "data-entity-id": node.attrs.entityId,
        "data-entity-type": node.attrs.entityType,
      }),
      `${prefix}${node.attrs.label ?? ""}`,
    ];
  },

  renderText({ node }) {
    const prefix = node.attrs.entityType === "clue" ? "#" : "@";
    return `${prefix}${node.attrs.label ?? ""}`;
  },

  addNodeView() {
    return ReactNodeViewRenderer(MentionChip);
  },

  addProseMirrorPlugins() {
    const suggestions = this.options.suggestions as EntityMentionSuggestion[];
    let closeMenu: (() => void) | null = null;

    return suggestions.map((suggestion, index) =>
      Suggestion({
        editor: this.editor,
        char: suggestion.char,
        pluginKey: new PluginKey(`entity-mention-${suggestion.char}-${index}`),
        items: ({ query }) => suggestion.items({ query }),
        command: ({ editor, range, props }) => {
          const item = props as EntityMentionItem;
          editor
            .chain()
            .focus()
            .insertContentAt(range, {
              type: this.name,
              attrs: {
                entityId: item.entityId,
                entityType: item.entityType,
                label: item.label,
              },
            })
            .run();
          if (closeMenu) {
            closeMenu();
          }
        },
        render: () => {
          const list = renderList();
          closeMenu = () => {
            if (typeof (list as { closeNow?: () => void }).closeNow === "function") {
              (list as { closeNow: () => void }).closeNow();
            }
          };
          return list;
        },
      })
    );
  },
});
