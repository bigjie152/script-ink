import { ActionButton } from '@editor-v2/components';
import { TaskList } from '@editor-v2/extensions/TaskList/TaskList';
import { useToggleActive } from '@editor-v2/hooks/useActive';
import { useButtonProps } from '@editor-v2/hooks/useButtonProps';

export function RichTextTaskList() {
  const buttonProps = useButtonProps(TaskList.name);

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

