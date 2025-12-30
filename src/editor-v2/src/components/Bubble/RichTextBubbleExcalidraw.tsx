import { useCallback, useEffect } from 'react';

import { BubbleMenu } from '@tiptap/react/menus';

import { ActionButton } from '@editor-v2/components/ActionButton';
import { SizeSetter } from '@editor-v2/components/SizeSetter/SizeSetter';
import type { IExcalidrawAttrs } from '@editor-v2/extensions/Excalidraw';
import { Excalidraw } from '@editor-v2/extensions/Excalidraw';
import { useAttributes } from '@editor-v2/hooks/useAttributes';
import { useLocale } from '@editor-v2/locales';
import { useEditorInstance } from '@editor-v2/store/editor';
import { useEditableEditor } from '@editor-v2/store/store';
import { triggerOpenExcalidrawSettingModal } from '@editor-v2/utils/_event';
import { deleteNode } from '@editor-v2/utils/delete-node';
import { getEditorContainerDOMSize } from '@editor-v2/utils/editor-container-size';

export function RichTextBubbleExcalidraw() {
  const editable = useEditableEditor();
  const editor = useEditorInstance();

  const { t } = useLocale();
  const { width: maxWidth } = getEditorContainerDOMSize(editor);
  const attrs = useAttributes<IExcalidrawAttrs>(editor, Excalidraw.name, {
    defaultShowPicker: false,
    createUser: '',
    width: 0,
    height: 0,
  });
  const { defaultShowPicker, createUser, width, height } = attrs;

  const setSize = useCallback(
    (size: any) => {
      editor
        .chain()
        .updateAttributes(Excalidraw.name, size)
        .setNodeSelection(editor.state.selection.from)
        .focus()
        .run();
    },
    [editor],
  );
  const openEditLinkModal = useCallback(() => {
    triggerOpenExcalidrawSettingModal({ ...attrs, editor });
  }, [editor, attrs]);
  const shouldShow = useCallback(() => editor.isActive(Excalidraw.name), [editor]);
  const deleteMe = useCallback(() => deleteNode(Excalidraw.name, editor), [editor]);

  useEffect(() => {
    if (defaultShowPicker) {
      openEditLinkModal();
      editor.chain().updateAttributes(Excalidraw.name, { defaultShowPicker: false }).focus().run();
    }
  }, [createUser, defaultShowPicker, editor, openEditLinkModal]);

  if (!editable) {
    return <></>;
  }

  return (
    <BubbleMenu
      editor={editor}
      options={{ placement: 'bottom', offset: 8, flip: true }}
      pluginKey={'RichTextBubbleExcalidraw'}
      shouldShow={shouldShow}
    >
      <div className="richtext-flex richtext-items-center richtext-gap-2 richtext-rounded-md  !richtext-border !richtext-border-solid !richtext-border-border richtext-bg-popover richtext-p-1 richtext-text-popover-foreground richtext-shadow-md richtext-outline-none">
        <ActionButton
          action={openEditLinkModal}
          icon="Pencil"
          tooltip={t('editor.edit')}
        />

        <SizeSetter height={height as any}
          maxWidth={maxWidth}
          onOk={setSize}
          width={width as any}
        >
          <ActionButton
            icon="Settings"
            tooltip={t('editor.settings')}
          />
        </SizeSetter>

        <ActionButton
          action={deleteMe}
          icon="Trash2"
          tooltip={t('editor.delete')}
        />
      </div>
    </BubbleMenu>
  );
}

