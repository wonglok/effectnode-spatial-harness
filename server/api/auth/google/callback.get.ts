import {
  defineEventHandler,
  getQuery,
  getCookie,
  deleteCookie,
  getRequestURL,
  sendRedirect,
} from "nitro/h3";
import type { H3Event } from "nitro/h3";
import { randomBytes } from "node:crypto";
import { ensureDb } from "../../../utils/mongoose";
import { User } from "../../../models/User";
import { setSessionCookie } from "../../../utils/session";
import {
  exchangeGoogleCode,
  getGoogleUserInfo,
} from "../../../utils/google-oauth";

const STATE_COOKIE = "google.oauth";

function readState(event: H3Event): { nonce: string; next: string } | null {
  const raw = getCookie(event, STATE_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { nonce?: unknown; next?: unknown };
    if (typeof parsed.nonce !== "string" || typeof parsed.next !== "string") {
      return null;
    }
    return { nonce: parsed.nonce, next: parsed.next };
  } catch {
    return null;
  }
}

/** Derive a unique, valid username from a Google profile base. */
async function makeUsername(base: string): Promise<string> {
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);
  let candidate = cleaned.length >= 3 ? cleaned : `user${cleaned || ""}`;
  candidate = candidate.slice(0, 24);

  while (await User.exists({ username: candidate })) {
    candidate = `${candidate.slice(0, 20)}_${randomBytes(2).toString("hex")}`;
  }
  return candidate;
}

export default defineEventHandler(async (event) => {
  const q = getQuery(event);
  const code = typeof q.code === "string" ? q.code : "";
  const state = typeof q.state === "string" ? q.state : "";

  const saved = readState(event);
  deleteCookie(event, STATE_COOKIE, { path: "/" });

  if (!code || !saved || state !== saved.nonce) {
    return sendRedirect(event, "/login?error=google", 302);
  }

  const redirectUri = `${getRequestURL(event).origin}/api/auth/google/callback`;

  let profile;
  try {
    const { access_token } = await exchangeGoogleCode(code, redirectUri);
    profile = await getGoogleUserInfo(access_token);
  } catch {
    return sendRedirect(event, "/login?error=google", 302);
  }

  if (!profile.email_verified) {
    return sendRedirect(event, "/login?error=google-unverified", 302);
  }

  const email = profile.email.toLowerCase();
  const googleId = profile.sub;

  await ensureDb();

  // Find-or-create: by googleId first, then by verified email (link), else new.
  let user = await User.findOne({ googleId });
  if (!user) {
    const byEmail = await User.findOne({ email });
    if (byEmail && byEmail.emailVerified) {
      byEmail.googleId = googleId;
      await byEmail.save();
      user = byEmail;
    } else if (byEmail) {
      // Email exists but was never verified locally — linking a Google identity
      // here would let anyone with a matching Google account hijack it.
      return sendRedirect(event, "/login?error=google-conflict", 302);
    }
  }

  if (!user) {
    const base = (profile.email.split("@")[0] || profile.name || "user").trim();
    user = await User.create({
      username: await makeUsername(base),
      email,
      emailVerified: true,
      passwordHash: null,
      googleId,
      avatarUrl: profile.picture ?? null,
      role: "public",
    });
  }

  await setSessionCookie(event, user._id.toString(), user.role);
  return sendRedirect(event, saved.next, 302);
});
