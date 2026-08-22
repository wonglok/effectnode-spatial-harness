import { defineEventHandler, getRouterParam, createError } from "nitro/h3";
import { requireRole } from "../../../utils/auth";
import { ensureDb, isValidObjectId } from "../../../utils/mongoose";
import { World } from "../../../models/World";

export default defineEventHandler(async (event) => {
  await requireRole(event, "admin");

  const id = getRouterParam(event, "id");
  if (!id || !isValidObjectId(id)) {
    throw createError({ statusCode: 404, statusMessage: "World not found" });
  }

  await ensureDb();
  const world = await World.findByIdAndDelete(id);
  if (!world) {
    throw createError({ statusCode: 404, statusMessage: "World not found" });
  }

  return { ok: true };
});
