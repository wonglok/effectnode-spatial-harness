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
  const thread = await ChatThread.findOneAndDelete({ _id: threadId, worldId: id });
  if (!thread) {
    throw createError({ statusCode: 404, statusMessage: "Thread not found" });
  }
  await ChatMessage.deleteMany({ threadId: thread._id });

  return { ok: true };
});
