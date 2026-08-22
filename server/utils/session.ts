import { SignJWT, jwtVerify } from "jose";
import {
  deleteCookie,
  getCookie,
  getRequestURL,
  setCookie,
} from "nitro/h3";
import type { H3Event } from "nitro/h3";
import type { AuthUser, UserRole } from "../../shared/types/auth";
import type { UserDocument } from "../models/User";

const COOKIE_NAME = "multiverse.session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionClaims {
  sub: string;
  role: UserRole;
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(secret);
}

function isSecure(event: H3Event): boolean {
  return getRequestURL(event).protocol === "https:";
}

/** Map a hydrated user document to the client-safe public shape. */
export function toPublicUser(doc: UserDocument): AuthUser {
  return {
    id: doc._id.toString(),
    username: doc.username,
    email: doc.email,
    emailVerified: doc.emailVerified,
    role: doc.role,
    avatarUrl: doc.avatarUrl ?? null,
    lastUsedMethod: doc.lastUsedMethod ?? null,
  };
}

export async function setSessionCookie(
  event: H3Event,
  userId: string,
  role: UserRole,
): Promise<void> {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + SESSION_MAX_AGE)
    .sign(getSecret());

  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
    secure: isSecure(event),
  });
}

export async function getSessionClaims(
  event: H3Event,
): Promise<SessionClaims | null> {
  const token = getCookie(event, COOKIE_NAME);
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return { sub: payload.sub, role: payload.role as UserRole };
  } catch {
    return null;
  }
}

export function destroySessionCookie(event: H3Event): void {
  deleteCookie(event, COOKIE_NAME, { path: "/" });
}
