import React, { Fragment, useMemo } from 'react';

import {
  ActionMenuButton,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@editor-v2/components';
import { FontFamily } from '@editor-v2/extensions/FontFamily/FontFamily';
import { useActive } from '@editor-v2/hooks/useActive';
import { useButtonProps } from '@editor-v2/hooks/useButtonProps';
import { useLocale } from '@editor-v2/locales';
import type { ButtonViewReturnComponentProps } from '@editor-v2/types';

export interface Item {
  title: string
  icon?: any
  font?: string
  isActive: NonNullable<ButtonViewReturnComponentProps['isActive']>
  action?: ButtonViewReturnComponentProps['action']
  style?: React.CSSProperties
  shortcutKeys?: string[]
  disabled?: boolean
  divider?: boolean
  default?: boolean
}

export function RichTextFontFamily() {
  const { t } = useLocale();

  const buttonProps = useButtonProps(FontFamily.name);

  const {
    icon = undefined,
    tooltip = undefined,
    items = [],
    isActive = undefined,
  } = buttonProps?.componentProps ?? {};

  const { disabled, dataState } = useActive(isActive);

  const title = useMemo(() => {
    return (dataState)?.font || t('editor.fontFamily.default.tooltip');
  }, [dataState]);

  if (!buttonProps) {
    return <></>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild
        disabled={disabled}
      >
        <ActionMenuButton
          disabled={disabled}
          icon={icon}
          title={title?.length > 12 ? `${title?.slice(0, 12)}...` : title}
          tooltip={tooltip}
        // tooltipOptions={tooltipOptions}
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent className="richtext-w-full">
        {items?.map((item: any, index: any) => {
          const style
            = item.font === t('editor.fontFamily.default.tooltip') ? {} : { fontFamily: item.font };

          return (
            <Fragment key={`font-family-${index}`}>
              <DropdownMenuCheckboxItem checked={title === item.font}
                onClick={item.action}
              >
                <div className="richtext-ml-1 richtext-h-full"
                  style={style}
                >
                  {item.font}
                </div>
              </DropdownMenuCheckboxItem>

              {item.font === t('editor.fontFamily.default.tooltip') && <DropdownMenuSeparator />}
            </Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

