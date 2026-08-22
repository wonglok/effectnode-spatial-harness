import { defineEventHandler, readBody, createError } from "nitro/h3";
import { requireAuth } from "../../utils/auth";
import { ensureDb, isDuplicateKey } from "../../utils/mongoose";
import { User } from "../../models/User";
import { toPublicUser } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event);
  const body = (await readBody(event)) as
    | { avatarUrl?: unknown; username?: unknown }
    | undefined;

  const updates: { avatarUrl?: string | null; username?: string } = {};

  if (body?.avatarUrl !== undefined) {
    const raw = String(body.avatarUrl);
    const cdn = process.env.CDN_DISTRIBUTION;
    if (raw && cdn && !raw.startsWith(cdn.replace(/\/$/, ""))) {
      throw createError({ statusCode: 400, statusMessage: "Invalid avatar URL" });
    }
    updates.avatarUrl = raw || null;
  }

  if (body?.username !== undefined) {
    const username = String(body.username).trim().toLowerCase();
    if (username.length < 3 || username.length > 24) {
      throw createError({ statusCode: 400, statusMessage: "Invalid username" });
    }
    updates.username = username;
  }

  if (Object.keys(updates).length === 0) {
    return { user: toPublicUser(user) };
  }

  await ensureDb();
  try {
    const updated = await User.findByIdAndUpdate(user._id, updates, {
      new: true,
      runValidators: true,
    });
    return { user: toPublicUser(updated!) };
  } catch (err) {
    if (isDuplicateKey(err)) {
      throw createError({ statusCode: 409, statusMessage: "Username already taken" });
    }
    throw err;
  }
});
