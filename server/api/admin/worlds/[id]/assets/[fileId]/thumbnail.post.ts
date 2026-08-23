import { defineEventHandler, getRouterParam, createError } from "nitro/h3";
import { randomUUID } from "node:crypto";
import mongoose from "mongoose";
import { requireRole } from "../../../../../../utils/auth";
import { ensureDb } from "../../../../../../utils/mongoose";
import { decodePublicId } from "../../../../../../utils/hashids";
import { FileSystem } from "../../../../../../models/FileSystem";
import { presignUpload, s3PublicUrl } from "../../../../../../utils/s3";

/** Presign a thumbnail upload for an existing asset (used to (re)generate it). */
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
  const doc = await FileSystem.findOne({ _id: fileId, worldId: id });
  if (!doc) {
    throw createError({ statusCode: 404, statusMessage: "File not found" });
  }

  const thumbKey = `worlds/${id}/assets/thumbnails/${randomUUID()}.png`;
  const thumbnailUploadUrl = await presignUpload(thumbKey, "image/png");
  const thumbnailUrl = s3PublicUrl(thumbKey);

  return { thumbnailUploadUrl, thumbnailUrl };
});
