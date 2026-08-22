import { defineEventHandler, readBody, getRouterParam, createError } from "nitro/h3";
import { requireRole } from "../../../utils/auth";
import { ensureDb } from "../../../utils/mongoose";
import { decodePublicId } from "../../../utils/hashids";
import { World, type WorldDoc } from "../../../models/World";
import { toPublicWorld } from "../../../utils/worlds";

export default defineEventHandler(async (event) => {
  await requireRole(event, "admin");

  const id = getRouterParam(event, "id");
  const body = (await readBody(event)) as
    | {
        name?: unknown;
        description?: unknown;
        coverUrl?: unknown;
        sceneURL?: unknown;
        featured?: unknown;
        published?: unknown;
      }
    | undefined;

  const objectId = id ? decodePublicId(id) : null;
  if (!objectId) {
    throw createError({ statusCode: 404, statusMessage: "World not found" });
  }

  const updates: Partial<WorldDoc> = {};

  if (body?.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) {
      throw createError({ statusCode: 400, statusMessage: "Name is required" });
    }
    updates.name = name.slice(0, 80);
  }
  if (body?.description !== undefined) {
    updates.description = String(body.description).trim().slice(0, 1000);
  }
  if (body?.coverUrl !== undefined) {
    updates.coverUrl = body.coverUrl ? String(body.coverUrl).trim() : null;
  }
  if (body?.sceneURL !== undefined) {
    updates.sceneURL = body.sceneURL ? String(body.sceneURL).trim() : null;
  }
  if (body?.featured !== undefined) updates.featured = !!body.featured;
  if (body?.published !== undefined) updates.published = !!body.published;

  await ensureDb();
  const world = await World.findByIdAndUpdate(objectId, updates, {
    new: true,
    runValidators: true,
  });
  if (!world) {
    throw createError({ statusCode: 404, statusMessage: "World not found" });
  }

  return { world: toPublicWorld(world) };
});
