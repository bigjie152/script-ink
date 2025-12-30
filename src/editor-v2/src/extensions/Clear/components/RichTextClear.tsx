import { ActionButton } from '@editor-v2/components/ActionButton';
import { Clear } from '@editor-v2/extensions/Clear/Clear';
import { useActive } from '@editor-v2/hooks/useActive';
import { useButtonProps } from '@editor-v2/hooks/useButtonProps';

export function RichTextClear() {
  const buttonProps = useButtonProps(Clear.name);

  const {
    icon = undefined,
    tooltip = undefined,
    shortcutKeys = undefined,
    tooltipOptions = {},
    action = undefined,
    isActive = undefined,
  } = buttonProps?.componentProps ?? {};

  const { disabled } = useActive(isActive);

  const onAction = () => {
       if (disabled) return;

    if (action) action();
  };

  if (!buttonProps) {
    return <></>;
  }

  return (
    <ActionButton
      action={onAction}
      disabled={disabled}
      icon={icon}
      shortcutKeys={shortcutKeys}
      tooltip={tooltip}
      tooltipOptions={tooltipOptions}
    />
  );
}

