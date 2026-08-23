import { defineEventHandler, getRouterParam, createError } from "nitro/h3";
import { requireRole } from "../../../../../utils/auth";
import { ensureDb } from "../../../../../utils/mongoose";
import { decodePublicId } from "../../../../../utils/hashids";
import { ChatThread } from "../../../../../models/Chat";

export default defineEventHandler(async (event) => {
  await requireRole(event, "admin");

  const id = getRouterParam(event, "id");
  if (!id || !decodePublicId(id)) {
    throw createError({ statusCode: 404, statusMessage: "World not found" });
  }

  await ensureDb();
  const threads = await ChatThread.find({ worldId: id }).sort({ updatedAt: -1 });

  return {
    threads: threads.map((t) => ({
      id: t._id.toString(),
      title: t.title,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
  };
});
