import { ActionButton } from '@editor-v2/components';
import { Iframe } from '@editor-v2/extensions/Iframe/Iframe';
import { useToggleActive } from '@editor-v2/hooks/useActive';
import { useButtonProps } from '@editor-v2/hooks/useButtonProps';

export function RichTextIframe() {
  const buttonProps = useButtonProps(Iframe.name);

  const {
    icon = undefined,
    tooltip = undefined,
    shortcutKeys = undefined,
    tooltipOptions = {},
    action = undefined,
    isActive = undefined,
  } = buttonProps?.componentProps ?? {};

  const { editorDisabled, update } = useToggleActive(isActive);

  const onAction = () => {
    if (editorDisabled) return;

    if (action) {
      action();
      update();
    }
  };

  if (!buttonProps) {
    return <></>;
  }

  return (
    <ActionButton
      action={onAction}
      disabled={editorDisabled}
      icon={icon}
      shortcutKeys={shortcutKeys}
      tooltip={tooltip}
      tooltipOptions={tooltipOptions}
    />
  );
}

