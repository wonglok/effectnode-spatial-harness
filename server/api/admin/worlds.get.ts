import { defineEventHandler } from "nitro/h3";
import { requireRole } from "../../utils/auth";
import { ensureDb } from "../../utils/mongoose";
import { World } from "../../models/World";
import { toPublicWorld } from "../../utils/worlds";

export default defineEventHandler(async (event) => {
  await requireRole(event, "admin");
  await ensureDb();

  const worlds = await World.find().sort({ createdAt: -1 });
  return { worlds: worlds.map(toPublicWorld) };
});
