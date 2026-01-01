import type { Editor, Range } from '@tiptap/core';
import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { ReactRenderer } from '@tiptap/react';
import { Suggestion } from '@tiptap/suggestion';

import SlashCommandNodeView from '@editor-v2/extensions/SlashCommand/components/SlashCommandNodeView';
import { updatePosition } from '@editor-v2/utils/updatePosition';

export * from './components/SlashCommandList';
export * from './renderCommandListDefault';

export const SlashCommand = /* @__PURE__ */ Extension.create<any>({
  name: 'richtextSlashCommand',
  priority: 200,

  // addOptions() {
  //   return {
  //     suggestion: {
  //       char: '/',
  //     },
  //   };
  // },

  addProseMirrorPlugins() {
    let closeMenu: (() => void) | null = null;

    return [
      Suggestion({
        pluginKey: new PluginKey('richtextSlashCommandPlugin'),
        editor: this.editor,
        char: '/',
        // allowSpaces: true,
        // startOfLine: true,
        // pluginKey: new PluginKey(`richtextCustomPlugin${this.name}`),

        // allow: ({ state, range }) => {
        //   const $from = state.doc.resolve(range.from);
        //   const isRootDepth = $from.depth === 1;
        //   const isParagraph = $from.parent.type.name === 'paragraph';
        //   const isStartOfNode = $from.parent.textContent?.charAt(0) === '/';

        //   const isInColumn = this.editor.isActive('column');
        //   const afterContent = $from.parent.textContent?.slice(
        //     Math.max(0, $from.parent.textContent?.indexOf('/')),
        //   );
        //   const isValidAfterContent = !afterContent?.endsWith('  ');

        //   return (
        //     ((isRootDepth && isParagraph && isStartOfNode)
        //       || (isInColumn && isParagraph && isStartOfNode))
        //     && isValidAfterContent
        //   );
        // },

        command: ({ editor, range, props }: { editor: Editor, range: Range, props: any }) => {
          const { view } = editor;
          props.action({ editor, range });
          view.focus();
          if (closeMenu) {
            closeMenu();
          }
        },

        render: () => {
          let reactRenderer: any;
          let lastProps: any = null;

          const destroy = () => {
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
          };

          closeMenu = () => {
            destroy();
          };

          const getSlashPos = () => {
            if (!lastProps?.range?.from) {
              return -1;
            }
            return lastProps.range.from - 1;
          };

          const hasTrigger = () => {
            const slashPos = getSlashPos();
            if (slashPos < 0) {
              return false;
            }
            const { state } = lastProps.editor;
            const slashChar = state.doc.textBetween(slashPos, slashPos + 1, '\0', '\0');
            return slashChar === '/';
          };

          const shouldHoldMenu = () => {
            if (!lastProps?.editor?.isFocused) {
              return false;
            }

            const { state } = lastProps.editor;
            if (!hasTrigger()) return false;

            const slashPos = getSlashPos();
            const selectionPos = state.selection.from;
            return selectionPos >= slashPos && selectionPos <= lastProps.range.to;
          };

          const shouldCloseImmediately = () => {
            if (!lastProps?.editor?.isFocused) {
              return true;
            }
            return !hasTrigger();
          };

          return {
            onStart: (props: any) => {
              if (!props.clientRect) {
                return;
              }
              lastProps = props;

              reactRenderer = new ReactRenderer(SlashCommandNodeView, {
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
              lastProps = props;
              reactRenderer.updateProps(props);

              if (!props.clientRect) {
                return;
              }
              updatePosition(props.editor, reactRenderer.element, props.clientRect);
            },

            onKeyDown(props) {
              if (props.event.key === 'Escape') {
                destroy();

                return true;
              }

              return reactRenderer.ref?.onKeyDown(props);
            },

            onExit() {
              if (!reactRenderer) {
                return;
              }
              if (shouldHoldMenu()) {
                return;
              }
              if (shouldCloseImmediately()) {
                destroy();
                return;
              }
              destroy();
            },
          };
        },
      }),
    ];
  }
});

