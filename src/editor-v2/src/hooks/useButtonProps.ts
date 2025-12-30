import { useMemo } from 'react';

import { useExtension } from '@editor-v2/hooks/useExtension';
import { useLocale } from '@editor-v2/locales';
import { useEditorInstance } from '@editor-v2/store/editor';
import { isFunction } from '@editor-v2/utils/utils';

export function useButtonProps(extensionName: string) {
  const editor = useEditorInstance();
  const extension = useExtension(extensionName);
  const { t } = useLocale();

  return useMemo(() => {
    if (!editor || !extension || !t) {
      return null;
    }

    const {
      button,
    } = extension.options;

    if (!button || !isFunction(button)) {
      return null;
    }

    const buttonProps = button({
      editor,
      extension,
      t,
    });

    return buttonProps;
  }, [editor, extension, t]);
}

