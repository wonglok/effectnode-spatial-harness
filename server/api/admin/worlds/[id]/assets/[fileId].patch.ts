import {
  defineEventHandler,
  getRouterParam,
  readBody,
  createError,
} from "nitro/h3";
import mongoose from "mongoose";
import { requireRole } from "../../../../../utils/auth";
import { ensureDb } from "../../../../../utils/mongoose";
import { decodePublicId } from "../../../../../utils/hashids";
import { FileSystem } from "../../../../../models/FileSystem";

export default defineEventHandler(async (event) => {
  await requireRole(event, "admin");

  const id = getRouterParam(event, "id");
  const fileId = getRouterParam(event, "fileId");
  if (!id || !decodePublicId(id) || !fileId) {
    throw createError({ statusCode: 404, statusMessage: "Not found" });
  }
  if (!mongoose.Types.ObjectId.isValid(fileId)) {
    throw createError({ statusCode: 404, statusMessage: "File not found" });
  }

  const body = (await readBody(event)) as
    | { thumbnailUrl?: unknown }
    | undefined;

  await ensureDb();
  const doc = await FileSystem.findOne({ _id: fileId, worldId: id });
  if (!doc) {
    throw createError({ statusCode: 404, statusMessage: "File not found" });
  }

  if (body?.thumbnailUrl !== undefined) {
    doc.thumbnailUrl = body.thumbnailUrl
      ? String(body.thumbnailUrl).trim()
      : null;
  }
  await doc.save();

  return { ok: true };
});
