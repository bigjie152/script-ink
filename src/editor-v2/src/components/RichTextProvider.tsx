import { useEffect, useId } from 'react';

import { type Editor } from '@tiptap/core';
import { EditorContext } from '@tiptap/react';

import { TooltipProvider } from '@editor-v2/components';
import { RESET_CSS } from '@editor-v2/constants/resetCSS';
import { EditorEditableReactive } from '@editor-v2/store/EditorEditableReactive';
import { ThemeColorReactive } from '@editor-v2/store/ThemeColorReactive';
import { removeCSS, updateCSS } from '@editor-v2/utils/dynamicCSS';

interface IProviderRichTextProps {
  editor: Editor
  children: React.ReactNode
  dark?: boolean
}

export function RichTextProvider({ editor, children }: IProviderRichTextProps) {
  const id = useId();

  useEffect(() => {
    updateCSS(RESET_CSS, 'react-tiptap-reset');

    return () => {
      removeCSS('react-tiptap-reset');
    };
  }, []);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-expect-error
    if (editor) editor.id = id;
  }, [id, editor]);

  if (!editor) {
    return <></>;
  }

  return (
    <div className="reactjs-tiptap-editor">
      <EditorContext.Provider value={{ editor }}>
        <TooltipProvider delayDuration={0}
          disableHoverableContent
        >
          {children}
        </TooltipProvider>

        <EditorEditableReactive
          editor={editor}
        />

        <ThemeColorReactive />
      </EditorContext.Provider>
    </div>
  );
}

