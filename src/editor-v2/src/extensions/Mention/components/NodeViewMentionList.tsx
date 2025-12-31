/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable react/display-name */
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import type { Editor } from '@tiptap/core';
import clsx from 'clsx';
import scrollIntoView from 'scroll-into-view-if-needed';

import { useLocale } from '@editor-v2/locales';

interface IProps {
  editor: Editor
  items: Array<{
    id: string
    label: string
    meta?: string
    entityType?: string
    avatar?: {
      src: string
    }
  }>
  command: any
  onClose?: () => void
}

export const NodeViewMentionList: React.FC<IProps> = forwardRef((props, ref) => {
  const $container: any = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { t } = useLocale();

  const selectItem = (index: any) => {
    const userName = props.items[index];
    if (!userName)
      return;
    props.command(userName);
  };

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
  };

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length);
  };

  const enterHandler = () => {
    selectItem(selectedIndex);
  };

  useEffect(() => setSelectedIndex(0), [props.items]);

  useEffect(() => {
    if (Number.isNaN(selectedIndex + 1)) {
      return;
    }
    const el = $container.current?.querySelector(
      `[data-mention-index="${selectedIndex}"]`,
    );
    if (el) {
      scrollIntoView(el, { behavior: 'smooth', scrollMode: 'if-needed' });
    }
  }, [selectedIndex]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === 'ArrowUp') {
        upHandler();
        return true;
      }

      if (event.key === 'ArrowDown') {
        downHandler();
        return true;
      }

      if (event.key === 'Enter') {
        enterHandler();
        return true;
      }

      return false;
    },
  }));

  return (
    <div
      className="notion-menu notion-menu--mention"
      data-richtext-portal
      ref={$container}
    >
      <div className="notion-menu-hint">{t('editor.command.hint')}</div>
      <div className="notion-menu-list">
        {props.items.length > 0 ? (
          props.items.map((item, index) => {
            const prefix = item.entityType === 'clue' ? '#' : '@';
            return (
              <button
                type="button"
                data-mention-index={index}
                className={clsx('notion-menu-item', {
                  'notion-menu-item-active': index === selectedIndex,
                })}
                key={`mention-item-${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  selectItem(index);
                }}
              >
                <span className="notion-menu-icon notion-menu-icon-pill">{prefix}</span>
                <span className="notion-menu-text">
                  <span className="notion-menu-label">{item?.label}</span>
                  {item?.meta && <span className="notion-menu-desc">{item.meta}</span>}
                </span>
              </button>
            );
          })
        ) : (
          <div className="notion-menu-empty">{t('editor.mention.empty')}</div>
        )}
      </div>
    </div>
  );
});
