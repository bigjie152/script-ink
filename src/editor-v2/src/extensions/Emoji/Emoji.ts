/* eslint-disable @typescript-eslint/ban-ts-comment */
import TiptapEmoji from '@tiptap/extension-emoji';
import { ReactRenderer } from '@tiptap/react';

import { updatePosition } from '@editor-v2/utils/updatePosition';

import EmojiNodeView from './components/EmojiList/EmojiNodeView';

export * from '@editor-v2/extensions/Emoji/components/RichTextEmoji';

export const EXTENSION_PRIORITY_HIGHEST = 200;

export const Emoji = /* @__PURE__ */ TiptapEmoji.extend({
  priority: EXTENSION_PRIORITY_HIGHEST,
  // emojis: gitHubEmojis,
  enableEmoticons: true,
  //@ts-expect-error
  addOptions() {
    return {
      ...this.parent?.(),
      HTMLAttributes: {},

      button: ({ editor, t }: any) => {
        return {
          componentProps: {
            editor,
            action: (emoji: any) => {
              const { selection } = editor.state;
              const { $anchor } = selection;
              editor.chain().focus().insertContentAt($anchor.pos, emoji).run();
            },
            isActive: () => true,
            icon: 'EmojiIcon',
            tooltip: t('editor.emoji.tooltip'),
          },
        };
      },
    };
  },

}).configure({
  suggestion: {
    // items: ({ query }: any) => {
    //   return emojiSearch(query);
    // },

    allowSpaces: false,

    render: () => {
      let reactRenderer: any;

      return {
        onStart: (props: any) => {
          if (!props.clientRect) {
            return;
          }

          reactRenderer = new ReactRenderer(EmojiNodeView, {
            props,
            editor: props.editor,
          });

          reactRenderer.element.style.position = 'absolute';

          document.body.appendChild(reactRenderer.element);

          updatePosition(props.editor, reactRenderer.element, props.clientRect);
        },

        onUpdate(props) {
          if (!reactRenderer) {
            return;
          }
          reactRenderer.updateProps(props);

          if (!props.clientRect) {
            return;
          }
          updatePosition(props.editor, reactRenderer.element, props.clientRect);
        },

        onKeyDown(props) {
          if (props.event.key === 'Escape') {
            if (reactRenderer) {
              try {
                reactRenderer.destroy();
              } catch {
                // Ignore teardown errors.
              }
              if (reactRenderer.element?.isConnected) {
                reactRenderer.element.remove();
              }
              reactRenderer = null;
            }

            return true;
          }

          return reactRenderer.ref?.onKeyDown(props);
        },

        onExit() {
          if (!reactRenderer) {
            return;
          }
          try {
            reactRenderer.destroy();
          } catch {
            // Ignore teardown errors.
          }
          if (reactRenderer.element?.isConnected) {
            reactRenderer.element.remove();
          }
          reactRenderer = null;
        },
      };
    },
  }
});

