import React, { useMemo } from 'react';

import {
  ActionButton,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  IconComponent,
  MenuDown,
} from '@editor-v2/components';
import { MoreMark } from '@editor-v2/extensions/MoreMark/MoreMark';
import { useActive } from '@editor-v2/hooks/useActive';
import { useButtonProps } from '@editor-v2/hooks/useButtonProps';
import type { ButtonViewReturnComponentProps } from '@editor-v2/types';
import { getShortcutKeys } from '@editor-v2/utils/plateform';

export interface Item {
  title: string
  icon?: any
  isActive: NonNullable<ButtonViewReturnComponentProps['isActive']>
  action?: ButtonViewReturnComponentProps['action']
  style?: React.CSSProperties
  shortcutKeys?: string[]
  disabled?: boolean
  divider?: boolean
  default?: boolean
}

export function RichTextMoreMark() {
  const buttonProps = useButtonProps(MoreMark.name);

  const {
    icon = undefined,
    tooltip = undefined,
    items = [],
    isActive = undefined,
  } = buttonProps?.componentProps ?? {};

  const { disabled, dataState } = useActive(isActive);

  const titleActive = useMemo(() => {
    return (dataState as any)?.title || '';
  }, [dataState]);

  if (!buttonProps) {
    return <></>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild
        disabled={disabled}
      >
        <ActionButton
          customClass="!richtext-w-12 richtext-h-12"
          disabled={disabled}
          icon={icon}
          tooltip={tooltip}
        >
          <MenuDown className="richtext-size-3 richtext-text-gray-500" />
        </ActionButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-full">
        {items?.map((item: any, index: any) => {
          return (
            <DropdownMenuCheckboxItem
              checked={titleActive === item.title}
              className="richtext-flex richtext-items-center richtext-gap-3"
              key={`more-mark-${index}`}
              onClick={item.action}
            >
              <IconComponent name={item?.icon} />

              <span className="richtext-ml-1">
                {item.title}
              </span>

              {!!item?.shortcutKeys && (
                <span className="richtext-ml-auto richtext-text-xs richtext-tracking-widest richtext-opacity-60">
                  {getShortcutKeys(item.shortcutKeys)}
                </span>
              )}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

