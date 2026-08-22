import { defineEventHandler, getRouterParam, createError } from "nitro/h3";
import { requireRole } from "../../../utils/auth";
import { ensureDb, isValidObjectId } from "../../../utils/mongoose";
import { World } from "../../../models/World";
import { toPublicWorld } from "../../../utils/worlds";

export default defineEventHandler(async (event) => {
  await requireRole(event, "admin");

  const id = getRouterParam(event, "id");
  if (!id || !isValidObjectId(id)) {
    throw createError({ statusCode: 404, statusMessage: "World not found" });
  }

  await ensureDb();
  const world = await World.findById(id);
  if (!world) {
    throw createError({ statusCode: 404, statusMessage: "World not found" });
  }

  return { world: toPublicWorld(world) };
});
