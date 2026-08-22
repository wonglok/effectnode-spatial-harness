import { defineEventHandler } from "nitro/h3";
import { destroySessionCookie } from "../../utils/session";

export default defineEventHandler((event) => {
  destroySessionCookie(event);
  return { ok: true };
});
