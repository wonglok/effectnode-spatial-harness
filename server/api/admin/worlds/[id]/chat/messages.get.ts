import { defineEventHandler, getRouterParam, getQuery, createError } from "nitro/h3";
import mongoose from "mongoose";
import { requireRole } from "../../../../../utils/auth";
import { ensureDb } from "../../../../../utils/mongoose";
import { decodePublicId } from "../../../../../utils/hashids";
import { ChatThread, ChatMessage } from "../../../../../models/Chat";

export default defineEventHandler(async (event) => {
  await requireRole(event, "admin");

  const id = getRouterParam(event, "id");
  if (!id || !decodePublicId(id)) {
    throw createError({ statusCode: 404, statusMessage: "World not found" });
  }

  const threadId = String(getQuery(event).threadId ?? "");
  if (!mongoose.Types.ObjectId.isValid(threadId)) {
    throw createError({ statusCode: 404, statusMessage: "Thread not found" });
  }

  await ensureDb();
  const thread = await ChatThread.findOne({ _id: threadId, worldId: id });
  if (!thread) {
    throw createError({ statusCode: 404, statusMessage: "Thread not found" });
  }

  const messages = await ChatMessage.find({ threadId: thread._id }).sort({
    createdAt: 1,
  });

  return {
    messages: messages.map((m) => ({
      id: m._id.toString(),
      role: m.role,
      content: m.content,
      createdAt: m.createdAt,
    })),
  };
});
