import type React from 'react';
import { useState } from 'react';

import { ActionButton, Popover, PopoverContent, PopoverTrigger } from '@editor-v2/components';
import { EmojiPicker, EmojiPickerContent, EmojiPickerFooter, EmojiPickerSearch } from '@editor-v2/components/ui/emoji-picker';
import { Emoji } from '@editor-v2/extensions/Emoji/Emoji';
import { useActive } from '@editor-v2/hooks/useActive';
import { useButtonProps } from '@editor-v2/hooks/useButtonProps';

interface IProps {
  showClear?: boolean
  onSelectEmoji: (arg: string) => void
  children: React.ReactNode
  disabled?: boolean
}

function EmojiPickerWrap({ onSelectEmoji, children, disabled }: IProps) {
  const [isOpen, setIsOpen] = useState(false);

  const onOpenChange = (open: boolean) => {
    if (disabled) return;

    setIsOpen(open);
  };

  return (
    <Popover onOpenChange={onOpenChange}
      open={isOpen}

    >
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>

      <PopoverContent className="!richtext-w-fit !richtext-p-0">
        <EmojiPicker
          className="!richtext-h-[342px]"
          onEmojiSelect={({ emoji }) => {
            onSelectEmoji(emoji);

            setIsOpen(false);
          }}
        >
          <EmojiPickerSearch />
          <EmojiPickerContent />
          <EmojiPickerFooter />
        </EmojiPicker>
      </PopoverContent>
    </Popover>
  );
}

export function RichTextEmoji() {
  const buttonProps = useButtonProps(Emoji.name);

  const {
    icon = undefined,
    tooltip = undefined,
    isActive = undefined,
    action
  } = buttonProps?.componentProps ?? {};

  const { disabled } = useActive(isActive);

  if (!buttonProps) {
    return <></>;
  }

  const onAction = (emoji: any) => {
    if (disabled) return;

    if (action) action(emoji);
  };

  return (
    <EmojiPickerWrap
    disabled={disabled}
    onSelectEmoji={onAction}
    >
      <ActionButton
        icon={icon}
        tooltip={tooltip}
        disabled={disabled}
      // tooltipOptions={tooltipOptions}
      />
    </EmojiPickerWrap>
  );
}

