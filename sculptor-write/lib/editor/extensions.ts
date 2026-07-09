import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { GhostText, type GhostCandidate } from "@/extensions/ai/GhostText";
import { SelectionGlow } from "@/extensions/ui/SelectionGlow";

export function getEditorExtensions(
  getCandidates?: () => GhostCandidate[],
  getActiveIndex?: () => number,
  isGhostLoading?: () => boolean
) {
  return [
    StarterKit.configure({
      heading: false,
      code: false,
      blockquote: false,
    }),
    Placeholder.configure({
      placeholder: "Start writing...",
    }),
    GhostText.configure({
      getCandidates: getCandidates || (() => []),
      getActiveIndex: getActiveIndex || (() => 0),
      isLoading: isGhostLoading || (() => false),
    }),
    SelectionGlow,
  ];
}
