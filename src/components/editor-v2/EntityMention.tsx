import { mergeAttributes, Node } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import { Suggestion } from "@tiptap/suggestion";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";

import { NodeViewMentionList } from "@editor-v2/extensions/Mention/components/NodeViewMentionList";
import { updatePosition } from "@editor-v2/utils/updatePosition";

import type { EntityType } from "./types";

export type EntityMentionItem = {
  id: string;
  label: string;
  entityId: string;
  entityType: EntityType;
};

type EntityMentionSuggestion = {
  char: string;
  items: (params: { query: string }) => EntityMentionItem[];
};

const renderList = () => {
  let reactRenderer: ReactRenderer | null = null;

  return {
    onStart: (props: SuggestionProps<EntityMentionItem, EntityMentionItem>) => {
      if (!props.clientRect?.()) return;

      reactRenderer = new ReactRenderer(NodeViewMentionList, {
        props,
        editor: props.editor,
      });

      reactRenderer.element.style.position = "absolute";
      document.body.appendChild(reactRenderer.element);
      updatePosition(props.editor, reactRenderer.element);
    },
    onUpdate(props: SuggestionProps<EntityMentionItem, EntityMentionItem>) {
      if (!reactRenderer) return;
      reactRenderer.updateProps(props);
      if (!props.clientRect?.()) return;
      updatePosition(props.editor, reactRenderer.element);
    },
    onKeyDown(props: SuggestionKeyDownProps) {
      if (props.event.key === "Escape") {
        if (reactRenderer) {
          reactRenderer.destroy();
          reactRenderer.element.remove();
          reactRenderer = null;
        }
        return true;
      }
      const handler = (reactRenderer?.ref as { onKeyDown?: (args: SuggestionKeyDownProps) => boolean })
        ?.onKeyDown;
      return handler ? handler(props) : false;
    },
    onExit() {
      if (reactRenderer) {
        reactRenderer.destroy();
        reactRenderer.element.remove();
        reactRenderer = null;
      }
    },
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

  addProseMirrorPlugins() {
    const suggestions = this.options.suggestions as EntityMentionSuggestion[];

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
        },
        render: renderList,
      })
    );
  },
});
