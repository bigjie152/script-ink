import React from 'react';

import { ActionButton } from '@editor-v2/components';
import CreateTablePopover from '@editor-v2/extensions/Table/components/CreateTablePopover';
import { Table } from '@editor-v2/extensions/Table/Table';
import { useToggleActive } from '@editor-v2/hooks/useActive';
import { useButtonProps } from '@editor-v2/hooks/useButtonProps';
import { useEditorInstance } from '@editor-v2/store/editor';

export function RichTextTable() {
  const editor = useEditorInstance();
 const buttonProps = useButtonProps(Table.name);

  const {
    icon = undefined,
    tooltip = undefined,
    action = undefined,
    isActive = undefined,
    color
  } = buttonProps?.componentProps ?? {};

  const { dataState, disabled } = useToggleActive(isActive);

  if (!buttonProps) {
    return <></>;
  }

  function createTable(options: any) {
    editor
      .chain()
      .focus()
      .insertTable({ ...options, withHeaderRow: false })
      .run();
  }

  return (
    <CreateTablePopover createTable={createTable}
    dataState={dataState}
    >
      <ActionButton
        action={action}
        color={color}
        dataState={dataState}
        icon={icon}
        isActive={isActive}
        tooltip={tooltip}
        // tooltipOptions={tooltipOptions}
        disabled={disabled}
      />
    </CreateTablePopover>
  );
}

