import { defineEventHandler, getRouterParam, createError } from "nitro/h3";
import { requireRole } from "../../../../../utils/auth";
import { ensureDb } from "../../../../../utils/mongoose";
import { decodePublicId } from "../../../../../utils/hashids";
import { FileSystem } from "../../../../../models/FileSystem";
import { removeS3Object } from "../../../../../utils/s3";

/** Delete every asset (S3 object + FileSystem record) for a world. */
export default defineEventHandler(async (event) => {
  await requireRole(event, "admin");

  const id = getRouterParam(event, "id");
  if (!id || !decodePublicId(id)) {
    throw createError({ statusCode: 404, statusMessage: "World not found" });
  }

  await ensureDb();
  const docs = await FileSystem.find({ worldId: id });

  await Promise.allSettled(
    docs.map((d) => removeS3Object(d.key).catch(() => {})),
  );
  await FileSystem.deleteMany({ worldId: id });

  return { ok: true, deleted: docs.length };
});
