import { defineEventHandler } from "nitro/h3";
import { getSessionUser } from "../../utils/auth";
import { toPublicUser } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const user = await getSessionUser(event);
  if (!user) return { user: null };
  return { user: toPublicUser(user) };
});
