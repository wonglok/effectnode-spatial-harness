import { defineEventHandler, readBody, createError } from "nitro/h3";
import { requireRole } from "../../utils/auth";
import { ensureDb } from "../../utils/mongoose";
import { World } from "../../models/World";
import { toPublicWorld, normalizeProps } from "../../utils/worlds";

export default defineEventHandler(async (event) => {
  await requireRole(event, "admin");

  const body = (await readBody(event)) as
    | {
        name?: unknown;
        description?: unknown;
        coverUrl?: unknown;
        sceneURL?: unknown;
        props?: unknown;
        featured?: unknown;
        published?: unknown;
      }
    | undefined;

  const name = String(body?.name ?? "").trim();
  if (!name) {
    throw createError({ statusCode: 400, statusMessage: "Name is required" });
  }

  await ensureDb();
  const world = await World.create({
    name: name.slice(0, 80),
    description: String(body?.description ?? "").trim().slice(0, 1000),
    coverUrl: body?.coverUrl ? String(body.coverUrl).trim() : null,
    sceneURL: body?.sceneURL ? String(body.sceneURL).trim() : null,
    props: normalizeProps(body?.props),
    featured: !!body?.featured,
    published: !!body?.published,
  });

  return { world: toPublicWorld(world) };
});
