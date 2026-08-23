import OpenAI from "openai";

// Local LM Studio / Ollama OpenAI-compatible server. No real token needed.
const client = new OpenAI({
  baseURL: process.env.LMSTUDIO_BASE_URL ?? "http://localhost:1234/v1",
  apiKey: process.env.LMSTUDIO_API_KEY ?? "lm-studio",
});

export const LLM_MODEL =
  process.env.LMSTUDIO_MODEL ?? "google/gemma-4-e4b";

export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

/** Call the local chat model and return the assistant's reply text. */
export async function chatCompletion(messages: ChatTurn[]): Promise<string> {
  const res = await client.chat.completions.create({
    model: LLM_MODEL,
    messages: messages as any,
  });
  return res.choices[0]?.message?.content?.trim() ?? "";
}
