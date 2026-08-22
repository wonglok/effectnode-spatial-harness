import { defineEventHandler, getRouterParam, createError } from "nitro/h3";
import { requireRole } from "../../../utils/auth";
import { ensureDb } from "../../../utils/mongoose";
import { decodePublicId } from "../../../utils/hashids";
import { World } from "../../../models/World";

export default defineEventHandler(async (event) => {
  await requireRole(event, "admin");

  const rawId = getRouterParam(event, "id");
  const id = rawId ? decodePublicId(rawId) : null;
  if (!id) {
    throw createError({ statusCode: 404, statusMessage: "World not found" });
  }

  await ensureDb();
  const world = await World.findByIdAndDelete(id);
  if (!world) {
    throw createError({ statusCode: 404, statusMessage: "World not found" });
  }

  return { ok: true };
});
