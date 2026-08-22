import {
  defineEventHandler,
  getQuery,
  getRequestURL,
  sendRedirect,
  setCookie,
} from "nitro/h3";
import { randomBytes } from "node:crypto";
import { buildGoogleAuthUrl } from "../../../utils/google-oauth";
import { getSessionUser } from "../../../utils/auth";

const STATE_COOKIE = "google.oauth";
const STATE_TTL = 600; // 10 minutes

export default defineEventHandler(async (event) => {
  const rawNext = String(getQuery(event).next ?? "/");
  // Only allow same-origin relative paths to prevent open redirects.
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/";
  const intent = getQuery(event).intent === "connect" ? "connect" : "login";

  // Linking to an existing account requires an active session.
  if (intent === "connect" && !(await getSessionUser(event))) {
    return sendRedirect(event, "/login", 302);
  }

  const nonce = randomBytes(16).toString("hex");
  const redirectUri = `${getRequestURL(event).origin}/api/auth/google/callback`;

  // Store the nonce + post-login destination + intent in a short-lived cookie.
  setCookie(event, STATE_COOKIE, JSON.stringify({ nonce, next, intent }), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: STATE_TTL,
    secure: getRequestURL(event).protocol === "https:",
  });

  return sendRedirect(event, buildGoogleAuthUrl(redirectUri, nonce), 302);
});
