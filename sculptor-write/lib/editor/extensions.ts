import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { GhostText } from "@/extensions/ai/GhostText";
import { SelectionGlow } from "@/extensions/ui/SelectionGlow";

export function getEditorExtensions(getGhostText?: () => string | null) {
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
      getText: getGhostText || (() => null),
    }),
    SelectionGlow,
  ];
}
