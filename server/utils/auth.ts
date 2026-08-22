import { createError } from "nitro/h3";
import type { H3Event } from "nitro/h3";
import type { UserRole } from "../../shared/types/auth";
import { User, type UserDocument } from "../models/User";
import { ensureDb } from "./mongoose";
import { getSessionClaims } from "./session";

export async function getSessionUser(
  event: H3Event,
): Promise<UserDocument | null> {
  const claims = await getSessionClaims(event);
  if (!claims) return null;
  await ensureDb();
  return (await User.findById(claims.sub)) ?? null;
}

export async function requireAuth(
  event: H3Event,
): Promise<{ userId: string; user: UserDocument }> {
  const user = await getSessionUser(event);
  if (!user) {
    throw createError({ statusCode: 401, statusMessage: "Unauthorized" });
  }
  return { userId: user._id.toString(), user };
}

export async function requireRole(
  event: H3Event,
  role: UserRole,
): Promise<{ userId: string; user: UserDocument }> {
  const ctx = await requireAuth(event);
  // Read from the freshly-loaded document so promotions take effect immediately.
  if (ctx.user.role !== role) {
    throw createError({ statusCode: 403, statusMessage: "Forbidden" });
  }
  return ctx;
}
