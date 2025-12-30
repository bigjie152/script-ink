import { useCallback, useMemo, useState } from 'react';

import katexLib from 'katex';

import { ActionButton, Button, Label } from '@editor-v2/components';
import { Dialog, DialogContent, DialogFooter, DialogTitle, DialogTrigger } from '@editor-v2/components/ui/dialog';
import { Textarea } from '@editor-v2/components/ui/textarea';
import type { IKatexAttrs } from '@editor-v2/extensions/Katex/Katex';
import { Katex } from '@editor-v2/extensions/Katex/Katex';
import { useToggleActive } from '@editor-v2/hooks/useActive';
import { useAttributes } from '@editor-v2/hooks/useAttributes';
import { useButtonProps } from '@editor-v2/hooks/useButtonProps';
import { useLocale } from '@editor-v2/locales';
import { useEditorInstance } from '@editor-v2/store/editor';
import { safeJSONParse } from '@editor-v2/utils/json';

export function RichTextKatex() {
  const { t } = useLocale();
  const [visible, toggleVisible] = useState(false);

  const buttonProps = useButtonProps(Katex.name);

  const {
    icon = undefined,
    tooltip = undefined,
    tooltipOptions = {},
    isActive = undefined,
  } = buttonProps?.componentProps ?? {};

  const { editorDisabled } = useToggleActive(isActive);

  const editor = useEditorInstance();

  const attrs = useAttributes<IKatexAttrs>(editor, Katex.name, {
    text: '',
    macros: '',
  });
  const { text, macros } = attrs;

  const [currentValue, setCurrentValue] = useState(decodeURIComponent(text || ''));
  const [currentMacros, setCurrentMacros] = useState(decodeURIComponent(macros || ''));

  const submit = useCallback(() => {

    editor.chain().focus().setKatex({
      text: encodeURIComponent(currentValue),
      macros: encodeURIComponent(currentMacros),
    }).run();

    setCurrentValue('');
    setCurrentMacros('');
    toggleVisible(false);
  }, [editor, currentValue, currentMacros]);

  const formatText = useMemo(() => {
    try {
      return katexLib.renderToString(currentValue, {
        macros: safeJSONParse(currentMacros)
      });
    } catch {
      return currentValue;
    }
  }, [currentMacros, currentValue]);

  const previewContent = useMemo(
    () => {
      if (`${currentValue}`.trim()) {
        return formatText;
      }

      return null;
    },
    [currentValue, formatText],
  );

  return (
    <Dialog
      onOpenChange={toggleVisible}
      open={visible}
    >
      <DialogTrigger
        asChild
        disabled={editorDisabled}
      >
        <ActionButton
          disabled={editorDisabled}
          icon={icon}
          tooltip={tooltip}
          tooltipOptions={tooltipOptions}
          action={() => {
            if (editorDisabled) return;
            toggleVisible(true);
          }}
        />
      </DialogTrigger>

      <DialogContent className="richtext-z-[99999] !richtext-max-w-[1300px]">
        <DialogTitle>
          {t('editor.formula.dialog.text')}
        </DialogTitle>

        <div
          style={{ height: '100%', border: '1px solid hsl(var(--border))' }}
        >
          <div className="richtext-flex richtext-gap-[10px] richtext-rounded-[10px] richtext-p-[10px]">
            <div className='richtext-flex-1'>
              <Label className="mb-[6px]">
                Expression
              </Label>

              <Textarea
                autoFocus
                className="richtext-mb-[10px]"
                onChange={e => setCurrentValue(e.target.value)}
                placeholder="Text"
                required
                rows={10}
                value={currentValue}
                style={{
                  color: 'hsl(var(--foreground))',
                }}
              />

              <Label className="mb-[6px]">
                Macros
              </Label>

              <Textarea
                className="richtext-flex-1"
                placeholder="Macros"
                rows={10}
                value={currentMacros}
                onChange={e => {
                  setCurrentMacros(e.target.value);
                }}
                style={{
                  color: 'hsl(var(--foreground))',
                }}
              />
            </div>

            <div
              className="richtext-flex richtext-flex-1 richtext-items-center richtext-justify-center richtext-rounded-[10px] richtext-p-[10px]"
              dangerouslySetInnerHTML={{ __html: previewContent || '' }}
              style={{ height: '100%', borderWidth: 1, minHeight: 500, background: '#fff' }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={submit}
            type="button"
          >
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

