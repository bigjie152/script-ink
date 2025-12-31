import React, {
  Fragment,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

import { IconComponent, Label } from '@editor-v2/components';
import { useFilterCommandList } from '@editor-v2/extensions/SlashCommand/renderCommandListDefault';
import { cn } from '@editor-v2/lib/utils';
import { useLocale } from '@editor-v2/locales';
import { useSignalCommandList } from '@editor-v2/store/commandList';

function SlashCommandNodeView(props: any, ref: any) {
  const [commandList] = useSignalCommandList();

  const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);
  const [selectedGroupIndex, setSelectedGroupIndex] = useState(0);
  const scrollContainer = useRef<HTMLDivElement | null>(null);

  const { t } = useLocale();

  const commandQuery = useFilterCommandList(commandList, props.query);

  const highlightMatch = (label: string) => {
    const query = props.query?.trim();
    if (!query) return label;
    const lower = label.toLowerCase();
    const idx = lower.indexOf(query.toLowerCase());
    if (idx === -1) return label;
    return (
      <>
        {label.slice(0, idx)}
        <span className="notion-menu-highlight">{label.slice(idx, idx + query.length)}</span>
        {label.slice(idx + query.length)}
      </>
    );
  };

  const activeItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useImperativeHandle(ref, () => {
    return {
      onKeyDown,
    };
  });

  useEffect(() => {
    if (!scrollContainer.current) {
      return;
    }
    const activeItemIndex = selectedGroupIndex * 1000 + selectedCommandIndex;
    const activeItem = activeItemRefs.current[activeItemIndex];
    if (activeItem) {
      activeItem.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedCommandIndex, selectedGroupIndex]);

  function onKeyDown({ event }: any) {
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
  }

  function upHandler() {
    if (commandQuery.length === 0) {
      return false;
    }
    let newCommandIndex = selectedCommandIndex - 1;
    let newGroupIndex = selectedGroupIndex;

    if (newCommandIndex < 0) {
      newGroupIndex = selectedGroupIndex - 1;
      newCommandIndex = commandQuery[newGroupIndex]?.commands.length - 1 || 0;
    }

    if (newGroupIndex < 0) {
      newGroupIndex = commandQuery.length - 1;
      newCommandIndex = commandQuery[newGroupIndex].commands.length - 1;
    }

    setSelectedCommandIndex(newCommandIndex);
    setSelectedGroupIndex(newGroupIndex);
  }

  function downHandler() {
    if (commandQuery.length === 0) {
      return false;
    }
    const commands = commandQuery[selectedGroupIndex].commands;
    let newCommandIndex = selectedCommandIndex + 1;
    let newGroupIndex = selectedGroupIndex;

    if (commands.length - 1 < newCommandIndex) {
      newCommandIndex = 0;
      newGroupIndex = selectedGroupIndex + 1;
    }
    if (commandQuery.length - 1 < newGroupIndex) {
      newGroupIndex = 0;
    }
    setSelectedCommandIndex(newCommandIndex);
    setSelectedGroupIndex(newGroupIndex);
  }

  function enterHandler() {
    if (commandQuery.length === 0 || selectedGroupIndex === -1 || selectedCommandIndex === -1) {
      return false;
    }

    selectItem(selectedGroupIndex, selectedCommandIndex);
  }

  function selectItem(groupIndex: number, commandIndex: number) {
    const command = commandQuery[groupIndex].commands[commandIndex];
    props?.command(command);
  }

  function createCommandClickHandler(groupIndex: number, commandIndex: number) {
    selectItem(groupIndex, commandIndex);
  }
  function setActiveItemRef(groupIndex: number, commandIndex: number, el: any) {
    activeItemRefs.current[groupIndex * 1000 + commandIndex] = el;
  }

  return (
    <div
      className="notion-menu"
      data-richtext-portal
      ref={scrollContainer}
    >
      <div className="notion-menu-hint">{t('editor.command.hint')}</div>
      {commandQuery?.length ? (
        <div className="notion-menu-list">
          {commandQuery?.map((group: any, groupIndex: any) => (
            <div className="notion-menu-section" key={`slash-${group.title}`}>
              <Label className="notion-menu-group">{group.title}</Label>
              {group.commands.map((command: any, commandIndex: any) => (
                <button
                  key={`command-${commandIndex}`}
                  onClick={() => createCommandClickHandler(groupIndex, commandIndex)}
                  ref={(el) => setActiveItemRef(groupIndex, commandIndex, el)}
                  className={cn("notion-menu-item", {
                    "notion-menu-item-active":
                      selectedGroupIndex === groupIndex && selectedCommandIndex === commandIndex,
                  })}
                >
                  <span className="notion-menu-icon">
                    {command.iconUrl && <img alt="" src={command.iconUrl} />}
                    {command.iconName && <IconComponent name={command.iconName} />}
                  </span>
                  <span className="notion-menu-text">
                    <span className="notion-menu-label">{highlightMatch(command.label)}</span>
                    {command.description && (
                      <span className="notion-menu-desc">{command.description}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="notion-menu-empty">
          <span>{t('editor.slash.empty')}</span>
        </div>
      )}
    </div>
  );
}

export default forwardRef(SlashCommandNodeView);

