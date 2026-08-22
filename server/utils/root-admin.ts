import { ensureDb } from "./mongoose";
import { User, type UserDocument } from "../models/User";

/**
 * Development-only root-admin backdoor. Lets you sign in with
 * `ROOT_ADMIN_USERNAME` / `ROOT_ADMIN_PASSWORD` from `.env.local` without
 * going through registration. Disabled when `NODE_ENV !== "development"`.
 */

export function getRootAdminUsername(): string | null {
  const value = process.env.ROOT_ADMIN_USERNAME;
  return value ? value.trim().toLowerCase() : null;
}

export function isRootAdminLoginEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    !!getRootAdminUsername() &&
    !!process.env.ROOT_ADMIN_PASSWORD
  );
}

export function isRootAdminIdentifier(identifier: string): boolean {
  const username = getRootAdminUsername();
  return !!username && identifier === username;
}

export function checkRootAdminPassword(password: string): boolean {
  const expected = process.env.ROOT_ADMIN_PASSWORD;
  return !!expected && password === expected;
}

/**
 * Find-or-create the root admin user (role `admin`, no password hash so it
 * can't be signed into through the normal password path).
 */
export async function ensureRootAdmin(): Promise<UserDocument> {
  const username = getRootAdminUsername();
  if (!username) throw new Error("ROOT_ADMIN_USERNAME is not set");

  await ensureDb();
  const user = await User.findOneAndUpdate(
    { username },
    {
      $setOnInsert: {
        username,
        email: `${username}@root.local`,
        emailVerified: true,
        role: "admin",
        passwordHash: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  if (!user) throw new Error("Failed to create root admin user");
  return user;
}
