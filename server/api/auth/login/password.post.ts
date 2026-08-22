import { defineEventHandler, readBody, createError } from "nitro/h3";
import bcrypt from "bcryptjs";
import { ensureDb } from "../../../utils/mongoose";
import { User } from "../../../models/User";
import { setSessionCookie, toPublicUser } from "../../../utils/session";
import {
  checkRootAdminPassword,
  ensureRootAdmin,
  isRootAdminIdentifier,
  isRootAdminLoginEnabled,
} from "../../../utils/root-admin";

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as
    | { identifier?: unknown; password?: unknown }
    | undefined;
  const identifier = String(body?.identifier ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!identifier || !password) {
    throw createError({ statusCode: 400, statusMessage: "Missing fields" });
  }

  // Development root-admin backdoor (ROOT_ADMIN_USERNAME / ROOT_ADMIN_PASSWORD).
  if (
    isRootAdminLoginEnabled() &&
    isRootAdminIdentifier(identifier) &&
    checkRootAdminPassword(password)
  ) {
    const root = await ensureRootAdmin();
    root.lastUsedMethod = "password";
    await root.save();
    await setSessionCookie(event, root._id.toString(), root.role);
    return { user: toPublicUser(root) };
  }

  await ensureDb();
  const user = await User.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  });

  // Generic message — don't reveal whether the identifier exists.
  if (!user || !user.passwordHash) {
    throw createError({ statusCode: 401, statusMessage: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    throw createError({ statusCode: 401, statusMessage: "Invalid credentials" });
  }

  user.lastUsedMethod = "password";
  await user.save();

  await setSessionCookie(event, user._id.toString(), user.role);
  return { user: toPublicUser(user) };
});
