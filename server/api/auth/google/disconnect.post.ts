import { defineEventHandler, createError } from "nitro/h3";
import { requireAuth } from "../../../utils/auth";
import { Passkey } from "../../../models/Passkey";

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event);

  // Guard: don't leave the account with no way to sign back in.
  const passkeyCount = await Passkey.countDocuments({ user: user._id });
  if (!user.passwordHash && passkeyCount === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "Add another sign-in method before disconnecting Google",
    });
  }

  user.googleId = null;
  await user.save();
  return { ok: true };
});
