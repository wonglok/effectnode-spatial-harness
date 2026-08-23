import { defineEventHandler, getRouterParam, readBody, createError } from "nitro/h3";
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

  const body = (await readBody(event)) as { title?: unknown } | undefined;
  const title = String(body?.title ?? "").trim().slice(0, 200) || "New chat";

  await ensureDb();
  const thread = await ChatThread.create({ worldId: id, title });

  return {
    thread: {
      id: thread._id.toString(),
      title: thread.title,
      createdAt: thread.createdAt,
      updatedAt: thread.updatedAt,
    },
  };
});
