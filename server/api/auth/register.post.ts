import { defineEventHandler, readBody, createError } from "nitro/h3";
import bcrypt from "bcryptjs";
import { ensureDb, isDuplicateKey } from "../../utils/mongoose";
import { User } from "../../models/User";
import { setSessionCookie, toPublicUser } from "../../utils/session";
import { sendVerificationEmail } from "../../utils/email";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as
    | { username?: unknown; email?: unknown; password?: unknown }
    | undefined;

  const username = String(body?.username ?? "").trim().toLowerCase();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

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

  await ensureDb();
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await User.create({
      username,
      email,
      passwordHash,
      role: "public",
      emailVerified: false,
    });

    await setSessionCookie(event, user._id.toString(), user.role);
    // Fire-and-forget — don't block registration on email delivery.
    sendVerificationEmail(user, event).catch(() => {});

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
