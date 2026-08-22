import {
  deleteCookie,
  getCookie,
  getRequestHost,
  getRequestURL,
  setCookie,
} from "nitro/h3";
import type { H3Event } from "nitro/h3";

const CHALLENGE_COOKIE = "webauthn.challenge";
const CHALLENGE_TTL = 300; // 5 minutes

export type ChallengeKind = "registration" | "authentication";

export interface ChallengePayload {
  challenge: string;
  kind: ChallengeKind;
  userId?: string;
}

/**
 * WebAuthn rpID must be a registrable domain with no port. `localhost` is the
 * special case that lets passkeys work over plain HTTP during local dev.
 */
export function getRpID(event: H3Event): string {
  const override = process.env.AUTH_RP_ID;
  if (override) return override;
  return getRequestHost(event).split(":")[0];
}

/** Accepted origins, derived from the live request plus any extras. */
export function getOrigins(event: H3Event): string[] {
  const origins = [getRequestURL(event).origin];
  const extra = process.env.AUTH_ORIGINS;
  if (extra) {
    for (const part of extra.split(",")) {
      const origin = part.trim();
      if (origin) origins.push(origin);
    }
  }
  return origins;
}

export function setChallengeCookie(
  event: H3Event,
  challenge: string,
  kind: ChallengeKind,
  userId?: string,
): void {
  const payload: ChallengePayload = { challenge, kind, userId };
  setCookie(event, CHALLENGE_COOKIE, JSON.stringify(payload), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: CHALLENGE_TTL,
    secure: getRequestURL(event).protocol === "https:",
  });
}

export function getChallengeCookie(event: H3Event): ChallengePayload | null {
  const raw = getCookie(event, CHALLENGE_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ChallengePayload;
    if (typeof parsed.challenge !== "string" || typeof parsed.kind !== "string") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearChallengeCookie(event: H3Event): void {
  deleteCookie(event, CHALLENGE_COOKIE, { path: "/" });
}
