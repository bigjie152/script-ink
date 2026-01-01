import { computePosition, flip, shift } from "@floating-ui/dom";
import type { Editor } from "@tiptap/core";
import { posToDOMRect } from "@tiptap/react";

type ClientRectResolver = (() => DOMRect | null) | null | undefined;

export function updatePosition(editor: Editor | null, element: HTMLElement | null, clientRect?: ClientRectResolver) {
  if (!editor || editor.isDestroyed || !element || !element.isConnected) {
    return;
  }

  let rect: DOMRect | null = null;
  if (clientRect) {
    try {
      rect = clientRect();
    } catch {
      rect = null;
    }
  }

  if (!rect) {
    try {
      const view = editor.view;
      rect = posToDOMRect(view, editor.state.selection.from, editor.state.selection.to);
    } catch {
      return;
    }
  }

  const virtualElement = {
    getBoundingClientRect: () => rect as DOMRect,
  };

  computePosition(virtualElement, element, {
    placement: "bottom-start",
    strategy: "absolute",
    middleware: [shift(), flip()],
  }).then(({ x, y, strategy }) => {
    if (!element.isConnected) return;
    element.style.width = "max-content";
    element.style.position = strategy;
    element.style.left = `${x}px`;
    element.style.top = `${y}px`;
  });
}
