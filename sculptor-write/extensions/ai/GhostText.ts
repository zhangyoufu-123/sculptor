// extensions/ai/GhostText.ts
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension } from "@tiptap/core";

export interface GhostTextOptions {
  getText: () => string | null;
  isLoading?: () => boolean;
}

const GHOST_TEXT_KEY = new PluginKey("ghostText");

export const GhostText = Extension.create<GhostTextOptions>({
  name: "ghostText",

  addOptions() {
    return {
      getText: () => null,
      isLoading: () => false,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: GHOST_TEXT_KEY,
        props: {
          decorations: (state) => {
            const text = this.options.getText();
            const loading = this.options.isLoading?.() || false;

            // Show loading pulse at cursor when fetching
            if (loading && state.selection.empty) {
              const { from } = state.selection;
              const deco = Decoration.widget(
                from,
                () => {
                  const span = document.createElement("span");
                  span.className = "ghost-text ghost-loading";
                  span.innerHTML = "···";
                  span.style.color = "var(--gold)";
                  span.style.opacity = "0.4";
                  span.style.pointerEvents = "none";
                  span.style.userSelect = "none";
                  span.style.animation = "glow-breathe 1s ease-in-out infinite";
                  return span;
                },
                { side: 1 }
              );
              return DecorationSet.create(state.doc, [deco]);
            }

            if (!text || text.length === 0) {
              return DecorationSet.empty;
            }

            const { from } = state.selection;
            // Show ghost text at any cursor position, not just end of document
            if (state.selection.empty) {
              const deco = Decoration.widget(
                from,
                () => {
                  const span = document.createElement("span");
                  span.className = "ghost-text";
                  span.innerHTML = `<span style="font-size:10px;color:var(--gold);opacity:0.5;margin-right:6px">[Tab]</span>${text}`;
                  span.style.color = "var(--text-tertiary)";
                  span.style.opacity = "0.5";
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
