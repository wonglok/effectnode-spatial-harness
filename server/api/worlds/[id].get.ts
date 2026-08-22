import { defineEventHandler, getRouterParam, createError } from "nitro/h3";
import { ensureDb, isValidObjectId } from "../../utils/mongoose";
import { World } from "../../models/World";
import { toPublicWorld } from "../../utils/worlds";
import { getSessionUser } from "../../utils/auth";

/** Public world lookup — admins can preview drafts; members see published only. */
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, "id");
  if (!id || !isValidObjectId(id)) {
    throw createError({ statusCode: 404, statusMessage: "World not found" });
  }

  await ensureDb();
  const world = await World.findById(id);
  if (!world) {
    throw createError({ statusCode: 404, statusMessage: "World not found" });
  }

  // Hide drafts from public members, but let admins preview them.
  if (!world.published) {
    const user = await getSessionUser(event);
    if (user?.role !== "admin") {
      throw createError({ statusCode: 404, statusMessage: "World not found" });
    }
  }

  return { world: toPublicWorld(world) };
});
