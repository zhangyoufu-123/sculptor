// lib/ai/prompts/skeleton.ts

export const SKELETON_SYSTEM_PROMPT = `You are a structural editor. Given an essay or article, produce a hierarchical outline.

Output JSON:
{
  "nodes": [
    {"id": "n1", "label": "Introduction: [topic]", "children": [], "position": 0},
    {"id": "n2", "label": "Section 1: [title]", "children": [
      {"id": "n2a", "label": "Point A", "children": [], "position": 0},
      {"id": "n2b", "label": "Point B", "children": [], "position": 1}
    ], "position": 1}
  ],
  "edges": [{"from": "n1", "to": "n2"}]
}

Rules:
- Max 3 levels deep
- Each node label max 30 characters
- Nodes must be connected in logical flow order
- Do NOT rewrite the content — only extract structure`;

export function buildSkeletonPrompt(text: string): string {
  return `Extract the hierarchical outline from this text:\n\n"""${text.slice(
    0,
    3000
  )}"""`;
}
