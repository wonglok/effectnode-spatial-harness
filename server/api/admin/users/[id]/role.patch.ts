import {
  defineEventHandler,
  getRouterParam,
  readBody,
  createError,
} from "nitro/h3";
import { requireRole } from "../../../../utils/auth";
import { ensureDb } from "../../../../utils/mongoose";
import { User, USER_ROLES } from "../../../../models/User";
import { toPublicUser } from "../../../../utils/session";
import type { UserRole } from "../../../../../shared/types/auth";

export default defineEventHandler(async (event) => {
  const { userId } = await requireRole(event, "admin");

  const id = getRouterParam(event, "id");
  const body = (await readBody(event)) as { role?: unknown } | undefined;
  const role = body?.role as UserRole;

  if (!id || typeof role !== "string" || !USER_ROLES.includes(role)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid role" });
  }

  if (id === userId) {
    throw createError({
      statusCode: 403,
      statusMessage: "You cannot change your own role",
    });
  }

  await ensureDb();
  const user = await User.findByIdAndUpdate(id, { role }, { new: true });
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  return { user: toPublicUser(user) };
});
