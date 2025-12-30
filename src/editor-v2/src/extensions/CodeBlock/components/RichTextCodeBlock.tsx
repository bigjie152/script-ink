import React from 'react';

import {
  ActionButton,
} from '@editor-v2/components';
import { CodeBlock } from '@editor-v2/extensions/CodeBlock/CodeBlock';
import { useToggleActive } from '@editor-v2/hooks/useActive';
import { useButtonProps } from '@editor-v2/hooks/useButtonProps';

export function RichTextCodeBlock() {
  const buttonProps = useButtonProps(CodeBlock.name);

  const {
    icon = undefined,
    tooltip = undefined,
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
      tooltip={tooltip}
      tooltipOptions={tooltipOptions}
    />
  );
}

