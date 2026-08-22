import { createHash, randomBytes } from "node:crypto";
import { Resend } from "resend";
import { getRequestURL } from "nitro/h3";
import type { H3Event } from "nitro/h3";
import type { Types } from "mongoose";
import type { UserDocument } from "../models/User";
import { VerificationToken } from "../models/VerificationToken";
import { ensureDb } from "./mongoose";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

/** Create an email-verification token; returns the raw token (hashed in DB). */
export async function createVerificationToken(
  userId: Types.ObjectId,
): Promise<string> {
  await ensureDb();
  const raw = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(raw).digest("hex");
  await VerificationToken.create({
    user: userId,
    tokenHash,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
  });
  return raw;
}

export async function sendVerificationEmail(
  user: UserDocument,
  event: H3Event,
): Promise<void> {
  const token = await createVerificationToken(user._id);
  const origin = getRequestURL(event).origin;
  const url = `${origin}/verify-email?token=${token}`;

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM ?? "Multiverse <onboarding@resend.dev>";

  if (!apiKey) {
    // Dev fallback: no email provider configured — log the link instead.
    console.log(`[auth] verification link for ${user.email}: ${url}`);
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from,
    to: user.email,
    subject: "Verify your email",
    html: `<p>Hi ${user.username},</p><p>Click the link below to verify your email address:</p><p><a href="${url}">Verify email</a></p>`,
  });
}
