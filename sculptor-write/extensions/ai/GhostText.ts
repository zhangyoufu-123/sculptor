// extensions/ai/GhostText.ts
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension } from "@tiptap/core";

export interface GhostTextOptions {
  getText: () => string | null;
}

const GHOST_TEXT_KEY = new PluginKey("ghostText");

export const GhostText = Extension.create<GhostTextOptions>({
  name: "ghostText",

  addOptions() {
    return {
      getText: () => null,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: GHOST_TEXT_KEY,
        props: {
          decorations: (state) => {
            const text = this.options.getText();
            if (!text || text.length === 0) {
              return DecorationSet.empty;
            }

            const { from } = state.selection;
            // Only show ghost text when cursor is at end and no selection
            if (state.selection.empty && from === state.doc.content.size - 1) {
              const deco = Decoration.widget(
                from,
                () => {
                  const span = document.createElement("span");
                span.className = "ghost-text";
                span.innerHTML = `<span style="font-size:10px;color:rgba(196,165,101,0.5);margin-right:6px">[Tab]</span>${text}`;
                span.style.color = "rgba(224, 216, 200, 0.3)";
                  span.style.pointerEvents = "none";
                  span.style.userSelect = "none";
                  return span;
                },
                { side: 1 }
              );
              return DecorationSet.create(state.doc, [deco]);
            }

            return DecorationSet.empty;
          },
        },
      }),
    ];
  },
});
