import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

export function getEditorExtensions() {
  return [
    StarterKit.configure({
      heading: false,
      code: false,
      blockquote: false,
    }),
    Placeholder.configure({
      placeholder: "Start writing...",
    }),
  ];
}
