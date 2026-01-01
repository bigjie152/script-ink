import BulitInMention, { type MentionOptions } from '@tiptap/extension-mention';
import { Extension, ReactRenderer } from '@tiptap/react';

import { NodeViewMentionList } from '@editor-v2/extensions/Mention/components/NodeViewMentionList';
import { updatePosition } from '@editor-v2/utils/updatePosition';

function render () {
  let reactRenderer: any;

  return {
    onStart: (props: any) => {
      if (!props.clientRect) {
        return;
      }

      reactRenderer = new ReactRenderer(NodeViewMentionList, {
        props,
        editor: props.editor,
      });

      reactRenderer.element.style.position = 'absolute';

      document.body.appendChild(reactRenderer.element);

      updatePosition(props.editor, reactRenderer.element, props.clientRect);
    },

    onUpdate(props: any) {
      if (!reactRenderer) {
        return;
      }
      reactRenderer.updateProps(props);

      if (!props.clientRect) {
        return;
      }
      updatePosition(props.editor, reactRenderer.element, props.clientRect);
    },

    onKeyDown(props: any) {
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
}

export const Mention = /* @__PURE__ */ Extension.create<MentionOptions>({
  name: 'richTextMentionWrapper',

  addExtensions() {
    const config: any = {
      ...this.options
    };

    if (this.options?.suggestion) {
      config['suggestion'] = {
        render: render,
        ...this.options.suggestion,
      };
    }

    if (this.options?.suggestions?.length) {
      config['suggestions'] = this.options.suggestions?.map((s) => {
        return {
          render: render,
          ...s,
        };
      });
    }

    return [BulitInMention.configure({
      HTMLAttributes: {
        class: 'mention',
      },
      ...config,
    })];
  },
});

