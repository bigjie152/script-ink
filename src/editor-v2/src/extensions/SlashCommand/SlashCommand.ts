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
const MIN_MENU_VISIBLE_MS = 3000;
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
          let exitTimer: number | null = null;
          let openedAt = 0;

          const clearExitTimer = () => {
            if (exitTimer) {
              window.clearTimeout(exitTimer);
              exitTimer = null;
            }
          };

          const destroy = () => {
            if (!reactRenderer) {
              return;
            }
            reactRenderer.destroy();
            reactRenderer.element.remove();
            reactRenderer = null;
          };

          closeMenu = () => {
            clearExitTimer();
            destroy();
          };

          return {
            onStart: (props: any) => {
              if (!props.clientRect) {
                return;
              }

              openedAt = Date.now();
              clearExitTimer();

              reactRenderer = new ReactRenderer(SlashCommandNodeView, {
                props,
                editor: props.editor,
              });

              reactRenderer.element.style.position = 'absolute';

              document.body.appendChild(reactRenderer.element);

              updatePosition(props.editor, reactRenderer.element);
            },

            onUpdate(props) {
              clearExitTimer();
              reactRenderer.updateProps(props);

              if (!props.clientRect) {
                return;
              }
              updatePosition(props.editor, reactRenderer.element);
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
              const elapsed = Date.now() - openedAt;
              const delay = Math.max(0, MIN_MENU_VISIBLE_MS - elapsed);
              clearExitTimer();
              exitTimer = window.setTimeout(() => {
                destroy();
                exitTimer = null;
              }, delay);
            },
          };
        },
      }),
    ];
  }
});

