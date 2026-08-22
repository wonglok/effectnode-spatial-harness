import { defineEventHandler } from "nitro/h3";
import { requireRole } from "../../utils/auth";
import { ensureDb } from "../../utils/mongoose";
import { User } from "../../models/User";
import { toPublicUser } from "../../utils/session";

export default defineEventHandler(async (event) => {
  await requireRole(event, "admin");
  await ensureDb();

  const users = await User.find().sort({ createdAt: -1 }).limit(100);
  return { users: users.map(toPublicUser) };
});
