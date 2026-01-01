import React, { useCallback, useEffect, useRef, useState } from 'react';

import DragHandle from '@tiptap/extension-drag-handle-react';
import { TextSelection, type NodeSelection } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';

import {
  ActionButton,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  IconComponent,
} from '@editor-v2/components';
import { Clear } from '@editor-v2/extensions/Clear';
import { Indent } from '@editor-v2/extensions/Indent';
import { TextAlign } from '@editor-v2/extensions/TextAlign';
import { useLocale } from '@editor-v2/locales';
import { useEditorInstance } from '@editor-v2/store/editor';
import { useEditableEditor } from '@editor-v2/store/store';
import { IndentProps, setNodeIndentMarkup } from '@editor-v2/utils/indent';

export function RichTextBubbleMenuDragHandle() {
  const editor = useEditorInstance() as any;
  const editable = useEditableEditor();

  const { t } = useLocale();
  const [currentNode, setCurrentNode] = useState<any>(null);
  const [currentNodePos, setCurrentNodePos] = useState(-1);
  const [menuOpen, setMenuOpen] = useState(false);
  const lastHandlePosRef = useRef<number | null>(null);

  const hasTextAlignExtension = editor?.extensionManager?.extensions?.some((ext: any) => ext?.name === TextAlign.name);
  const hasIndentExtension = editor?.extensionManager?.extensions?.some((ext: any) => ext?.name === Indent.name);
  const hasClearExtension = editor?.extensionManager?.extensions?.some((ext: any) => ext?.name === Clear.name);

  function resetTextFormatting() {
    const chain = editor.chain();
    chain.setNodeSelection(currentNodePos).unsetAllMarks();
    if (currentNode?.type.name !== 'paragraph') {
      chain.setParagraph();
    }
    chain.run();
  }
  function copyNodeToClipboard() {
    editor.chain().focus().setNodeSelection(currentNodePos).run();
    document.execCommand('copy');
  }
  function duplicateNode() {
    editor.commands.setNodeSelection(currentNodePos);
    const { $anchor } = editor.state.selection;
    const selectedNode = $anchor.node(1) || (editor.state.selection as NodeSelection).node;
    editor
      .chain()
      .setMeta('hideDragHandle', true)
      .insertContentAt(currentNodePos + (currentNode?.nodeSize || 0), selectedNode.toJSON())
      .run();
  }
  function setTextAlign(alignments: string) {
    editor.commands.setTextAlign(alignments);
  }
  function increaseIndent() {
    const indentTr = setNodeIndentMarkup(editor.state.tr, currentNodePos, 1);
    indentTr.setMeta('hideDragHandle', true);
    if (editor.view.dispatch)
      editor.view.dispatch(indentTr);
  }
  function decreaseIndent() {
    const tr = setNodeIndentMarkup(editor.state.tr, currentNodePos, -1);
    if (editor.view.dispatch)
      editor.view.dispatch(tr);
  }

  function deleteNode() {
    editor
      .chain()
      .setMeta('hideDragHandle', true)
      .setNodeSelection(currentNodePos)
      .deleteSelection()
      .run();
  }

  const handleNodeChange = useCallback((data: {
    node: Node | null;
    editor: Editor;
    pos: number
  }) => {
    if (!data.editor || data.editor.isDestroyed) {
      return;
    }
    if (data.node) {
      setCurrentNode(data.node);
    }
    setCurrentNodePos(data.pos);
    // Force update bubble menu position
    requestAnimationFrame(() => {
      try {
        if (!data.editor.isDestroyed) {
          data.editor.commands.focus();
        }
      } catch {
        // Editor view may not be ready yet.
      }
    });
  }, []);

  const handleAdd = (e: any) => {
    e.preventDefault();

    if (currentNodePos !== -1) {
      const currentNodeSize = currentNode?.nodeSize || 0;
      const insertPos = currentNodePos + currentNodeSize;
      const currentNodeIsEmptyParagraph
        = currentNode?.type.name === 'paragraph' && currentNode?.content?.size === 0;
      const focusPos = currentNodeIsEmptyParagraph ? currentNodePos + 2 : insertPos + 2;
      editor
        .chain()
        .command(({ dispatch, tr, state }: any) => {
          if (dispatch) {
            if (currentNodeIsEmptyParagraph) {
              tr.insertText('/', currentNodePos, currentNodePos + 1);
            } else {
              tr.insert(
                insertPos,
                state.schema.nodes.paragraph.create(null, [state.schema.text('/')]),
              );
            }

            return dispatch(tr);
          }

          return true;
        })
        .focus(focusPos)
        .run();
    }
  };

  const handleSelectBlock = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!editor || currentNodePos < 0) {
      return;
    }
    if (event.shiftKey && lastHandlePosRef.current !== null) {
      const from = Math.min(lastHandlePosRef.current, currentNodePos);
      const to = Math.max(
        lastHandlePosRef.current + (currentNode?.nodeSize || 0),
        currentNodePos + (currentNode?.nodeSize || 0),
      );
      const tr = editor.state.tr.setSelection(TextSelection.create(editor.state.doc, from, to));
      editor.view.dispatch(tr);
      return;
    }
    editor.commands.setNodeSelection(currentNodePos);
    lastHandlePosRef.current = currentNodePos;
  };

  useEffect(() => {
    if (!editor || editor.isDestroyed) {
      return;
    }
    if (menuOpen) {
      editor.commands.setMeta('lockDragHandle', true);
    } else {
      editor.commands.setMeta('lockDragHandle', false);
    }

    return () => {
      if (!editor || editor.isDestroyed) {
        return;
      }
      editor.commands.setMeta('lockDragHandle', false);
    };
  }, [menuOpen]);

  const handleMenuOpenChange = (open: any) => {
    if (!editable) {
      return;
    }
    setMenuOpen(open);
  };

  if (!editor || editor.isDestroyed) {
    return null;
  }

  return (
    <DragHandle
      className='richtext-transition-all richtext-duration-200 richtext-ease-out notion-handle'
      editor={editor}
      onNodeChange={handleNodeChange as any}
      pluginKey={'RichTextBubbleMenuDragHandle'}
    >
      <div
        className="richtext-flex richtext-items-center richtext-gap-1"
        onContextMenu={(event) => {
          event.preventDefault();
          handleMenuOpenChange(true);
        }}
      >
        <ActionButton
          action={handleAdd}
          disabled={!editable}
          icon='Plus'
          tooltip='插入块'
        />

        <ActionButton
          disabled={!editable}
          icon='Grip'
          tooltip='选择 / 拖拽'
          action={handleSelectBlock}
        />

        <DropdownMenu onOpenChange={handleMenuOpenChange}
          open={menuOpen}
        >
          <DropdownMenuTrigger className="richtext-pointer-events-none" />

          <DropdownMenuContent align="start"
            className="richtext-w-48"
            hideWhenDetached
            side="bottom"
            sideOffset={0}
          >
            <DropdownMenuItem
              className="richtext-flex richtext-gap-3 richtext-bg-opacity-10 hover:richtext-bg-red-400 hover:richtext-bg-opacity-20 focus:richtext-bg-red-400 focus:richtext-bg-opacity-30 focus:richtext-text-red-500 dark:hover:richtext-bg-opacity-20 dark:hover:richtext-text-red-500"
              onClick={deleteNode}
            >
              <IconComponent name="Trash2" />

              <span>
                {t('editor.remove')}
              </span>
            </DropdownMenuItem>

            {hasClearExtension
              ? (
                <DropdownMenuItem className="richtext-flex richtext-gap-3"
                  onClick={resetTextFormatting}
                >
                  <IconComponent name="PaintRoller" />

                  <span>
                    {t('editor.clear.tooltip')}
                  </span>
                </DropdownMenuItem>
              )
              : null}

            <DropdownMenuItem className="richtext-flex richtext-gap-3"
              onClick={copyNodeToClipboard}
            >
              <IconComponent name="Clipboard" />

              <span>
                {t('editor.copyToClipboard')}
              </span>
            </DropdownMenuItem>

            <DropdownMenuItem className="richtext-flex richtext-gap-3"
              onClick={duplicateNode}
            >
              <IconComponent name="Copy" />

              <span>
                {t('editor.copy')}
              </span>
            </DropdownMenuItem>

            {hasTextAlignExtension || hasIndentExtension
              ? (
                <DropdownMenuSeparator />
              )
              : null}

            {hasTextAlignExtension
              ? (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="richtext-flex richtext-gap-3">
                    <IconComponent name="AlignCenter" />

                    <span>
                      {t('editor.textalign.tooltip')}
                    </span>
                  </DropdownMenuSubTrigger>

                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem className="richtext-flex richtext-gap-3"
                        onClick={() => setTextAlign('left')}
                      >
                        <IconComponent name="AlignLeft" />

                        <span>
                          {t('editor.textalign.left.tooltip')}
                        </span>
                      </DropdownMenuItem>

                      <DropdownMenuItem className="richtext-flex richtext-gap-3"
                        onClick={() => setTextAlign('center')}
                      >
                        <IconComponent name="AlignCenter" />

                        <span>
                          {t('editor.textalign.center.tooltip')}
                        </span>
                      </DropdownMenuItem>

                      <DropdownMenuItem className="richtext-flex richtext-gap-3"
                        onClick={() => setTextAlign('right')}
                      >
                        <IconComponent name="AlignRight" />

                        <span>
                          {t('editor.textalign.right.tooltip')}
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              )
              : null}

            {hasIndentExtension
              ? (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger className="richtext-flex richtext-gap-3">
                    <IconComponent name="IndentIncrease" />

                    <span>
                      {t('editor.indent')}
                    </span>
                  </DropdownMenuSubTrigger>

                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem
                        className="richtext-flex richtext-gap-3"
                        disabled={currentNode?.attrs?.indent >= IndentProps.max}
                        onClick={increaseIndent}
                      >
                        <IconComponent name="IndentIncrease" />

                        <span>
                          {t('editor.indent.tooltip')}
                        </span>
                      </DropdownMenuItem>

                      <DropdownMenuItem
                        className="richtext-flex richtext-gap-3"
                        disabled={currentNode?.attrs?.indent <= IndentProps.min}
                        onClick={decreaseIndent}
                      >
                        <IconComponent name="IndentDecrease" />

                        <span>
                          {t('editor.outdent.tooltip')}
                        </span>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              )
              : null}

          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </DragHandle>
  );
}

