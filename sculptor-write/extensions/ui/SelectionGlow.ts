// extensions/ui/SelectionGlow.ts
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension } from "@tiptap/core";

const GLOW_KEY = new PluginKey("selectionGlow");

/**
 * Adds a subtle golden glow effect to selected text.
 * Pure decoration — no state management needed.
 */
export const SelectionGlow = Extension.create({
  name: "selectionGlow",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: GLOW_KEY,
        props: {
          decorations: (state) => {
            const { from, to } = state.selection;
            if (from === to || to - from > 500) {
              return DecorationSet.empty;
            }

            const deco = Decoration.inline(from, to, {
              style:
                "background: linear-gradient(90deg, rgba(196,165,101,0.08), rgba(196,165,101,0.15), rgba(196,165,101,0.08)); border-radius: 2px;",
            });

            return DecorationSet.create(state.doc, [deco]);
          },
        },
      }),
    ];
  },
});
