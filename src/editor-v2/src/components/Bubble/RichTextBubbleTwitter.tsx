import { useCallback, useState } from 'react';

import type { Editor } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';

import { ActionButton } from '@editor-v2/components/ActionButton';
import { Twitter } from '@editor-v2/extensions/Twitter';
import FormEditLinkTwitter from '@editor-v2/extensions/Twitter/components/FormEditLinkTwitter';
import { useLocale } from '@editor-v2/locales';
import { useEditorInstance } from '@editor-v2/store/editor';
import { useEditableEditor } from '@editor-v2/store/store';
import { deleteNode } from '@editor-v2/utils/delete-node';

export function RichTextBubbleTwitter() {
  const { t } = useLocale();
  const editable = useEditableEditor();
  const editor = useEditorInstance();

  const [showEdit, setShowEdit] = useState(false);

  const shouldShow = useCallback(({ editor }: { editor: Editor }) => {
    const isActive = editor.isActive(Twitter.name);
    return isActive;
  }, []);

  const onSetLink = (src: string) => {
    editor.commands.updateTweet({ src });
    setShowEdit(false);
  };

  const deleteMe = useCallback(() => deleteNode(Twitter.name, editor), [editor]);

  if (!editable) {
    return <></>;
  }

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'bottom', offset: 8, flip: true }}
      pluginKey={'RichTextBubbleTwitter'}
      shouldShow={shouldShow}
    >
      <>
        {showEdit
          ? (
            <div className="richtext-flex richtext-items-center richtext-gap-2 richtext-rounded-md  !richtext-border !richtext-border-solid !richtext-border-border richtext-bg-popover richtext-p-4 richtext-text-popover-foreground richtext-shadow-md richtext-outline-none">
            <FormEditLinkTwitter
              editor={editor}
              onSetLink={onSetLink}
            />
            </div>
          )
          : (
              <div className="richtext-flex richtext-items-center richtext-gap-2 richtext-rounded-md  !richtext-border !richtext-border-solid !richtext-border-border richtext-bg-popover richtext-p-1 richtext-text-popover-foreground richtext-shadow-md richtext-outline-none">
                <ActionButton
                  icon="Pencil"
                  tooltip={t('editor.link.edit.tooltip')}
                  tooltipOptions={{ sideOffset: 15 }}
                  action={() => {
                    setShowEdit(true);
                  }}
                />

                <ActionButton
                  action={deleteMe}
                  icon="Trash"
                  tooltip={t('editor.delete')}
                  tooltipOptions={{ sideOffset: 15 }}
                />
              </div>
          )}
      </>
    </BubbleMenu>
  );
}

