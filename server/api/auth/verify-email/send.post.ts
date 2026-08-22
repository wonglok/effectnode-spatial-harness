import { defineEventHandler } from "nitro/h3";
import { requireAuth } from "../../../utils/auth";
import { sendVerificationEmail } from "../../../utils/email";

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event);
  if (user.emailVerified) return { alreadyVerified: true };

  await sendVerificationEmail(user, event);
  return { sent: true };
});
