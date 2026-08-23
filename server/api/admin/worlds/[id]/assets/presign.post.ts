import { defineEventHandler, getRouterParam, readBody, createError } from "nitro/h3";
import { randomUUID } from "node:crypto";
import { requireRole } from "../../../../../utils/auth";
import { ensureDb } from "../../../../../utils/mongoose";
import { decodePublicId } from "../../../../../utils/hashids";
import { FileSystem } from "../../../../../models/FileSystem";
import { presignUpload, s3PublicUrl } from "../../../../../utils/s3";

function sanitize(filename: string): string {
  const name = filename.replace(/\.[^/.]+$/, "");
  const ext = filename.split(".").pop() ?? "";
  const clean =
    name
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "asset";
  const cleanExt = ext.replace(/[^a-zA-Z0-9]/g, "").slice(0, 10);
  return cleanExt ? `${clean}.${cleanExt}` : clean;
}

export default defineEventHandler(async (event) => {
  await requireRole(event, "admin");

  const id = getRouterParam(event, "id");
  if (!id || !decodePublicId(id)) {
    throw createError({ statusCode: 404, statusMessage: "World not found" });
  }

  const body = (await readBody(event)) as
    | { filename?: unknown; contentType?: unknown; size?: unknown }
    | undefined;

  const filename = String(body?.filename ?? "asset").slice(0, 255);
  const contentType =
    String(body?.contentType ?? "").trim() || "application/octet-stream";
  const size = Math.max(0, Number(body?.size) || 0);

  const key = `worlds/${id}/assets/${randomUUID()}-${sanitize(filename)}`;
  const uploadUrl = await presignUpload(key, contentType);
  const url = s3PublicUrl(key);

  // 3D models get a rendered thumbnail (generated client-side after upload).
  const isModel = /\.(glb|gltf)$/i.test(filename);
  let thumbnailUploadUrl: string | null = null;
  let thumbnailUrl: string | null = null;
  if (isModel) {
    const thumbKey = `worlds/${id}/assets/thumbnails/${randomUUID()}.png`;
    thumbnailUploadUrl = await presignUpload(thumbKey, "image/png");
    thumbnailUrl = s3PublicUrl(thumbKey);
  }

  await ensureDb();
  const doc = await FileSystem.create({
    worldId: id,
    key,
    name: filename,
    url,
    contentType,
    size,
    thumbnailUrl,
  });

  return {
    uploadUrl,
    thumbnailUploadUrl,
    key,
    url,
    contentType,
    fileId: doc._id.toString(),
  };
});
