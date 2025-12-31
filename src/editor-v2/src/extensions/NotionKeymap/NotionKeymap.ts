import { Extension } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

const isEmptyParagraph = (state: { selection: { empty: boolean; $from: any } }) => {
  const { selection } = state;
  if (!selection.empty) return false;
  const { $from } = selection;
  return $from.parent.type.name === "paragraph" && $from.parent.content.size === 0;
};

export const NotionKeymap = Extension.create({
  name: "notionKeymap",

  addKeyboardShortcuts() {
    const deleteEmptyBlock = (direction: "backward" | "forward") => {
      const { state, view } = this.editor;
      if (!isEmptyParagraph(state)) return false;

      const { $from } = state.selection;
      if ($from.depth === 0) return false;
      if (state.doc.childCount <= 1) return false;

      const before = $from.before();
      const after = $from.after();
      if (before <= 0 && direction === "backward") return false;

      const tr = state.tr.delete(before, after);
      const fallbackPos =
        direction === "forward"
          ? Math.min(before, tr.doc.content.size)
          : Math.max(0, before - 1);
      const resolved = tr.doc.resolve(fallbackPos);
      const nextPos = direction === "forward" ? resolved.pos : resolved.end(resolved.depth);
      tr.setSelection(TextSelection.create(tr.doc, nextPos));
      view.dispatch(tr);
      return true;
    };

    return {
      "Shift-Enter": () => this.editor.commands.setHardBreak(),
      Backspace: () => deleteEmptyBlock("backward"),
      Delete: () => deleteEmptyBlock("forward"),
    };
  },
});
