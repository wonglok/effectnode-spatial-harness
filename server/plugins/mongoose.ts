import { definePlugin } from "nitro";
import { ensureDb } from "../utils/mongoose";

/**
 * Pre-warm the MongoDB connection on worker startup (fire-and-forget). Every
 * handler still awaits `ensureDb()` itself, so a slow connect here never
 * blocks request handling.
 */
export default definePlugin(() => {
  if (process.env.MONGODB_URI) {
    ensureDb().catch(() => {});
  }
});
