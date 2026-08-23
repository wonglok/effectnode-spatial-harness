import { defineEventHandler, getRouterParam, createError } from "nitro/h3";
import { requireRole } from "../../../../../utils/auth";
import { ensureDb } from "../../../../../utils/mongoose";
import { decodePublicId } from "../../../../../utils/hashids";
import { FileSystem } from "../../../../../models/FileSystem";

export default defineEventHandler(async (event) => {
  await requireRole(event, "admin");

  const id = getRouterParam(event, "id");
  if (!id || !decodePublicId(id)) {
    throw createError({ statusCode: 404, statusMessage: "World not found" });
  }

  await ensureDb();
  const files = await FileSystem.find({ worldId: id }).sort({ createdAt: -1 });

  return {
    files: files.map((f) => ({
      id: f._id.toString(),
      name: f.name,
      url: f.url,
      key: f.key,
      contentType: f.contentType,
      size: f.size,
      createdAt: f.createdAt,
    })),
  };
});
