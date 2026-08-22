import { defineEventHandler, getQuery, createError } from "nitro/h3";
import { createHash } from "node:crypto";
import { ensureDb } from "../../../utils/mongoose";
import { User } from "../../../models/User";
import { VerificationToken } from "../../../models/VerificationToken";

export default defineEventHandler(async (event) => {
  const token = String(getQuery(event).token ?? "");
  if (!token) {
    throw createError({ statusCode: 400, statusMessage: "Missing token" });
  }

  const tokenHash = createHash("sha256").update(token).digest("hex");

  await ensureDb();
  const record = await VerificationToken.findOne({
    tokenHash,
    expiresAt: { $gt: new Date() },
  });
  if (!record) {
    throw createError({ statusCode: 400, statusMessage: "Invalid or expired token" });
  }

  await User.updateOne({ _id: record.user }, { emailVerified: true });
  await VerificationToken.deleteOne({ _id: record._id });

  return { verified: true };
});
