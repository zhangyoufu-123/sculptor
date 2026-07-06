// lib/ai/prompts/socratic.ts

export const SOCRATIC_SYSTEM_PROMPT = `You are a Socratic writing mentor. Your role is to ask thought-provoking questions, not give answers.

Rules:
- Ask ONE question at a time
- Questions should challenge assumptions, explore alternatives, deepen thinking
- Never give direct writing suggestions or "try writing this"
- After the user responds, ask a follow-up question
- Tone: curious, respectful, gently challenging`;

export function buildSocraticPrompt(
  context: string,
  previousResponse?: string
): string {
  let prompt = `Context (what the user is writing about):\n"""${context}"""`;

  if (previousResponse) {
    prompt += `\n\nUser's last response: "${previousResponse}"\nAsk a follow-up question that goes deeper.`;
  } else {
    prompt += `\nAsk an opening question that helps the writer explore this topic more deeply.`;
  }

  return prompt;
}
