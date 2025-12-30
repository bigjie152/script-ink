import { ActionButton } from '@editor-v2/components';
import { Column } from '@editor-v2/extensions/Column/Column';
import { useToggleActive } from '@editor-v2/hooks/useActive';
import { useButtonProps } from '@editor-v2/hooks/useButtonProps';

export function RichTextColumn() {
  const buttonProps = useButtonProps(Column.name);

  const {
    icon = undefined,
    tooltip = undefined,
    shortcutKeys = undefined,
    tooltipOptions = {},
    action = undefined,
    isActive = undefined,
  } = buttonProps?.componentProps ?? {};

  const { dataState, disabled, update } = useToggleActive(isActive);

  const onAction = () => {
    if (disabled) return;

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
      dataState={dataState}
      disabled={disabled}
      icon={icon}
      shortcutKeys={shortcutKeys}
      tooltip={tooltip}
      tooltipOptions={tooltipOptions}
    />
  );
}

