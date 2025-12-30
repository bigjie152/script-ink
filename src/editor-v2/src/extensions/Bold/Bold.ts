import type { BoldOptions as TiptapImageOptions } from '@tiptap/extension-bold';
import { Bold as TiptapBold } from '@tiptap/extension-bold';

import { ActionButton } from '@editor-v2/components';
import type { GeneralOptions } from '@editor-v2/types';

export * from './components/RichTextBold';

export interface BoldOptions extends TiptapImageOptions, GeneralOptions<BoldOptions> {}

export const Bold = /* @__PURE__ */ TiptapBold.extend<BoldOptions>({
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //@ts-expect-error
  addOptions() {
    return {
      ...this.parent?.(),
      button: ({ editor, t, extension }: any) => ({
        component: ActionButton,
        componentProps: {
          action: () => editor.commands.toggleBold(),
          isActive: () => editor.isActive('bold'),
          icon: 'Bold',
          shortcutKeys: extension.options.shortcutKeys ?? ['mod', 'B'],
          tooltip: t('editor.bold.tooltip'),
        },
      }),
    };
  },
});

