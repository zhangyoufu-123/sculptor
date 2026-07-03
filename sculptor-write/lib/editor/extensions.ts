import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import History from "@tiptap/extension-history";

export function getEditorExtensions() {
  return [
    StarterKit.configure({
      heading: false,
      code: false,
      blockquote: false,
    }),
    History.configure({
      depth: 100,
    }),
    Placeholder.configure({
      placeholder: "Start writing...",
    }),
  ];
}
