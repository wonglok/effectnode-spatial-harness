import { defineEventHandler, getRouterParam, createError } from "nitro/h3";
import { requireRole } from "../../../utils/auth";
import { ensureDb } from "../../../utils/mongoose";
import { User } from "../../../models/User";
import { Passkey } from "../../../models/Passkey";
import { VerificationToken } from "../../../models/VerificationToken";

export default defineEventHandler(async (event) => {
  const { userId } = await requireRole(event, "admin");

  const id = getRouterParam(event, "id");
  if (!id) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }
  if (id === userId) {
    throw createError({
      statusCode: 403,
      statusMessage: "You cannot delete yourself",
    });
  }

  await ensureDb();
  const user = await User.findByIdAndDelete(id);
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: "User not found" });
  }

  // Clean up the user's credentials and pending verification tokens.
  await Promise.all([
    Passkey.deleteMany({ user: id }),
    VerificationToken.deleteMany({ user: id }),
  ]);

  return { ok: true };
});
