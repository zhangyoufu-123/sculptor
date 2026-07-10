// extensions/ai/GhostText.ts — v6.1 Cursor-style multi-candidate + dual-layer
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { Extension } from "@tiptap/core";

export interface GhostCandidate {
  text: string;
  type: "draft" | "precise" | "conservative" | "jump" | "experiment";
}

export interface GhostTextOptions {
  getCandidates: () => GhostCandidate[];
  getActiveIndex: () => number; // 0 = draft, 1 = precise, 2+ = alternatives
  isLoading?: () => boolean;
}

const GHOST_TEXT_KEY = new PluginKey("ghostText");

export const GhostText = Extension.create<GhostTextOptions>({
  name: "ghostText",

  addOptions() {
    return {
      getCandidates: () => [],
      getActiveIndex: () => 0,
      isLoading: () => false,
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: GHOST_TEXT_KEY,
        props: {
          decorations: (state) => {
            const candidates = this.options.getCandidates();
            const activeIdx = this.options.getActiveIndex();
            const loading = this.options.isLoading?.() || false;

            // Show loading pulse when fetching
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

            if (candidates.length === 0) return DecorationSet.empty;

            const { from } = state.selection;
            if (!state.selection.empty) return DecorationSet.empty;

            const candidate = candidates[activeIdx];
            if (!candidate || !candidate.text) return DecorationSet.empty;

            const deco = Decoration.widget(
              from,
              () => {
                const container = document.createElement("span");
                container.style.pointerEvents = "none";
                container.style.userSelect = "none";

                // Badge: draft/precise label + index
                const typeLabel =
                  candidate.type === "draft"
                    ? "草稿"
                    : candidate.type === "precise"
                    ? "精确"
                    : candidate.type === "conservative"
                    ? "保守"
                    : candidate.type === "jump"
                    ? "跳跃"
                    : "实验";

                const badge = document.createElement("span");
                badge.style.fontSize = "9px";
                badge.style.color = "var(--gold)";
                badge.style.opacity = candidate.type === "draft" ? "0.3" : "0.55";
                badge.style.marginRight = "6px";
                badge.style.fontWeight = "600";
                badge.textContent = `[${typeLabel}]`;

                // Candidate counter
                if (candidates.length > 1) {
                  const counter = document.createElement("span");
                  counter.style.fontSize = "9px";
                  counter.style.color = "var(--text-tertiary)";
                  counter.style.opacity = "0.4";
                  counter.style.marginRight = "4px";
                  counter.textContent = `${activeIdx + 1}/${candidates.length} `;
                  badge.textContent = `[${typeLabel}]`;
                  container.appendChild(counter);
                }

                container.appendChild(badge);

                // Ghost text
                const textSpan = document.createElement("span");
                textSpan.textContent = candidate.text;
                textSpan.style.color = "var(--text-tertiary)";
                textSpan.style.opacity = candidate.type === "draft" ? "0.35" : "0.5";
                textSpan.style.fontFamily = "'Source Serif 4', serif";
                container.appendChild(textSpan);

                return container;
              },
              { side: 1 }
            );

            return DecorationSet.create(state.doc, [deco]);
          },
        },
      }),
    ];
  },
});
