import {
  defineEventHandler,
  getQuery,
  getRequestURL,
  sendRedirect,
  setCookie,
} from "nitro/h3";
import { randomBytes } from "node:crypto";
import { buildGoogleAuthUrl } from "../../../utils/google-oauth";

const STATE_COOKIE = "google.oauth";
const STATE_TTL = 600; // 10 minutes

export default defineEventHandler((event) => {
  const rawNext = String(getQuery(event).next ?? "/");
  // Only allow same-origin relative paths to prevent open redirects.
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const nonce = randomBytes(16).toString("hex");
  const redirectUri = `${getRequestURL(event).origin}/api/auth/google/callback`;

  // Store the nonce + post-login destination in a short-lived cookie (CSRF guard).
  setCookie(event, STATE_COOKIE, JSON.stringify({ nonce, next }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: STATE_TTL,
    secure: getRequestURL(event).protocol === "https:",
  });

  return sendRedirect(event, buildGoogleAuthUrl(redirectUri, nonce), 302);
});
