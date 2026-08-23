import { defineEventHandler, getRouterParam, readBody, createError } from "nitro/h3";
import mongoose from "mongoose";
import { requireRole } from "../../../../../utils/auth";
import { ensureDb } from "../../../../../utils/mongoose";
import { decodePublicId } from "../../../../../utils/hashids";
import { ChatThread, ChatMessage } from "../../../../../models/Chat";
import { chatCompletion } from "../../../../../utils/llm";

const SYSTEM_PROMPT =
  "You are a helpful assistant for a 3D world editor. Help the user manage " +
  "their scene assets, props, environment, and lighting. Be concise.";

function toPublic(m: { _id: unknown; role: string; content: string; createdAt: Date }) {
  return {
    id: (m._id as { toString(): string }).toString(),
    role: m.role,
    content: m.content,
    createdAt: m.createdAt,
  };
}

export default defineEventHandler(async (event) => {
  await requireRole(event, "admin");

  const id = getRouterParam(event, "id");
  if (!id || !decodePublicId(id)) {
    throw createError({ statusCode: 404, statusMessage: "World not found" });
  }

  const body = (await readBody(event)) as
    | { threadId?: unknown; content?: unknown }
    | undefined;
  const threadId = String(body?.threadId ?? "");
  const content = String(body?.content ?? "").trim();
  if (!content) {
    throw createError({ statusCode: 400, statusMessage: "Message is empty" });
  }
  if (!mongoose.Types.ObjectId.isValid(threadId)) {
    throw createError({ statusCode: 404, statusMessage: "Thread not found" });
  }

  await ensureDb();
  const thread = await ChatThread.findOne({ _id: threadId, worldId: id });
  if (!thread) {
    throw createError({ statusCode: 404, statusMessage: "Thread not found" });
  }

  // Persist the user message first.
  const userMessage = await ChatMessage.create({
    threadId: thread._id,
    role: "user",
    content,
  });

  // Auto-title the thread from the first user message.
  if (!thread.title || thread.title === "New chat") {
    thread.title = content.slice(0, 60);
    await thread.save();
  }

  // Build context from the most recent messages (oldest → newest).
  const history = await ChatMessage.find({ threadId: thread._id })
    .sort({ createdAt: -1 })
    .limit(20);
  const recent = history.reverse();
  const turns = [
    { role: "system" as const, content: SYSTEM_PROMPT },
    ...recent.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  let reply: string;
  try {
    reply = await chatCompletion(turns);
  } catch (err) {
    throw createError({
      statusCode: 502,
      statusMessage: `Local model unreachable: ${(err as Error).message}`,
    });
  }

  const assistantMessage = await ChatMessage.create({
    threadId: thread._id,
    role: "assistant",
    content: reply,
  });

  return {
    userMessage: toPublic(userMessage),
    assistantMessage: toPublic(assistantMessage),
  };
});
