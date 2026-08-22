import { defineEventHandler, getQuery } from "nitro/h3";
import { ensureDb } from "../../utils/mongoose";
import { World } from "../../models/World";
import { toPublicWorld } from "../../utils/worlds";

/** Public world list — published worlds only; optional `?featured=true`. */
export default defineEventHandler(async (event) => {
  const featuredOnly = getQuery(event).featured === "true";

  await ensureDb();
  const filter: { published: boolean; featured?: boolean } = {
    published: true,
  };
  if (featuredOnly) filter.featured = true;

  const worlds = await World.find(filter).sort({ createdAt: -1 });
  return { worlds: worlds.map(toPublicWorld) };
});
