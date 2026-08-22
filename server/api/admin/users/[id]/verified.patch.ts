import {
  defineEventHandler,
  getRouterParam,
  readBody,
  createError,
} from "nitro/h3";
import { requireRole } from "../../../../utils/auth";
import { ensureDb } from "../../../../utils/mongoose";
import { User } from "../../../../models/User";
import { toPublicUser } from "../../../../utils/session";

export default defineEventHandler(async (event) => {
  await requireRole(event, "admin");

  const id = getRouterParam(event, "id");
  const body = (await readBody(event)) as { verified?: unknown } | undefined;

  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }
  if (typeof body?.verified !== "boolean") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid verified value",
    });
  }

  await ensureDb();
  const user = await User.findByIdAndUpdate(
    id,
    { emailVerified: body.verified },
    { new: true },
  );
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  return { user: toPublicUser(user) };
});
