import { defineEventHandler, getRouterParam, createError } from "nitro/h3";
import mongoose from "mongoose";
import { requireRole } from "../../../../../utils/auth";
import { ensureDb } from "../../../../../utils/mongoose";
import { decodePublicId } from "../../../../../utils/hashids";
import { FileSystem } from "../../../../../models/FileSystem";
import { removeS3Object } from "../../../../../utils/s3";

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

  await ensureDb();
  const doc = await FileSystem.findOneAndDelete({ _id: fileId, worldId: id });
  if (!doc) {
    throw createError({ statusCode: 404, statusMessage: "File not found" });
  }

  try {
    await removeS3Object(doc.key);
  } catch {
    // best effort — the S3 object may already be gone.
  }

  return { ok: true };
});
