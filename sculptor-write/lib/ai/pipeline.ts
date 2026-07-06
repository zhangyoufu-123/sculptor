// lib/ai/pipeline.ts
import { collectContext } from "./context-manager";
import { analyzeIntent } from "./intent-analyzer";
import { readStyle } from "./style-reader";
import { buildFinalPrompt } from "./instruction-rewriter";
import { deepRetrieve } from "./deep-retrieval";
import { createClient } from "@/lib/deepseek";
import type { StreamEvent, RelevantMaterial } from "@/types/editor";

interface PipelineInput {
  userId: string;
  documentId?: string | null;
  currentText: string;
  explicitIntent?: string;
  userInstruction?: string;
}

export async function* runPipeline(
  input: PipelineInput
): AsyncGenerator<StreamEvent> {
  try {
    // Step 1: Collect context
    const ctx = await collectContext({
      userId: input.userId,
      documentId: input.documentId,
      currentText: input.currentText,
      userInstruction: input.userInstruction,
    });

    // Step 2: Analyze intent
    const intent = analyzeIntent(ctx, input.explicitIntent);

    // Step 3: Read style
    const style = readStyle(ctx, intent);

    // Step 4: Deep retrieval — text-based keyword matching
    const materials = deepRetrieve(ctx, intent, style);

    // Step 5: Build final prompt
    const { systemPrompt, userMessage } = buildFinalPrompt(
      ctx,
      intent,
      style,
      materials
    );

    // Step 6: Call LLM
    const client = createClient();
    const response = await client.chat.completions.create({
      model: "deepseek-chat",
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      yield { type: "error", error: "Empty AI response" };
      return;
    }

    const parsed = JSON.parse(content);
    const options = (parsed.options || []).map(
      (o: { text: string; style_shift: string }, i: number) => ({
        index: i,
        text: o.text,
        styleShift: o.style_shift || "",
      })
    );

    for (const opt of options) {
      yield { type: "option", ...opt };
    }

    yield { type: "done", total: options.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    yield { type: "error", error: msg };
  }
}
