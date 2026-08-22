import { defineEventHandler, readBody, createError } from "nitro/h3";
import bcrypt from "bcryptjs";
import { requireRole } from "../../utils/auth";
import { ensureDb, isDuplicateKey } from "../../utils/mongoose";
import { User, USER_ROLES } from "../../models/User";
import { toPublicUser } from "../../utils/session";
import type { UserRole } from "../../../shared/types/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default defineEventHandler(async (event) => {
  await requireRole(event, "admin");

  const body = (await readBody(event)) as
    | {
        username?: unknown;
        email?: unknown;
        password?: unknown;
        role?: unknown;
      }
    | undefined;

  const username = String(body?.username ?? "")
    .trim()
    .toLowerCase();
  const email = String(body?.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(body?.password ?? "");
  const role = body?.role as UserRole;

  if (username.length < 3 || username.length > 24) {
    throw createError({
      statusCode: 400,
      statusMessage: "Username must be 3–24 characters",
    });
  }
  if (!EMAIL_RE.test(email)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid email" });
  }
  if (password.length < 8) {
    throw createError({
      statusCode: 400,
      statusMessage: "Password must be at least 8 characters",
    });
  }
  if (typeof role !== "string" || !USER_ROLES.includes(role)) {
    throw createError({ statusCode: 400, statusMessage: "Invalid role" });
  }

  await ensureDb();
  try {
    const user = await User.create({
      username,
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role,
      emailVerified: false,
    });
    return { user: toPublicUser(user) };
  } catch (err) {
    if (isDuplicateKey(err)) {
      throw createError({
        statusCode: 409,
        statusMessage: "Username or email already taken",
      });
    }
    throw err;
  }
});
