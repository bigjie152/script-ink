import { Fragment } from 'react';

import {
  ActionButton,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconComponent,
} from '@editor-v2/components';
import { LineHeight } from '@editor-v2/extensions/LineHeight/LineHeight';
import { useActive } from '@editor-v2/hooks/useActive';
import { useButtonProps } from '@editor-v2/hooks/useButtonProps';

export function RichTextLineHeight() {
  const buttonProps = useButtonProps(LineHeight.name);

  const {
    tooltip = undefined,
    items,
    icon,
    isActive = undefined,
  } = buttonProps?.componentProps ?? {};

  const { editorDisabled, dataState } = useActive(isActive);

  if (!buttonProps) {
    return <></>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild
        disabled={editorDisabled}
      >
        <ActionButton
          customClass="!richtext-w-12 richtext-h-12"
          disabled={editorDisabled}
          icon={icon}
          tooltip={tooltip}
        >
          <IconComponent className="richtext-ml-1 richtext-size-3 richtext-text-zinc-500"
            name="MenuDown"
          />
        </ActionButton>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="richtext-min-w-24">
        {items?.map((item: any, index: any) => {
          return (
            <Fragment key={`line-height-${index}`}>
              <DropdownMenuCheckboxItem
                checked={item.value === (dataState)?.value}
                onClick={() => item?.action()}
              >
                {item.label}
              </DropdownMenuCheckboxItem>

              {item.value === 'Default' && <DropdownMenuSeparator />}
            </Fragment>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

