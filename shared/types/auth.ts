/**
 * Auth wire types shared between the browser client and the Nitro server.
 * Kept in `shared/` (mirrors `shared/types/realtime.ts`) so both sides import
 * the same contracts via relative paths.
 */

export type UserRole = "admin" | "editor" | "public";
export type LoginMethod = "password" | "passkey";

/** The user shape returned to the client — never includes secrets. */
export interface AuthUser {
  id: string;
  username: string;
  email: string;
  emailVerified: boolean;
  googleLinked: boolean;
  role: UserRole;
  avatarUrl: string | null;
  lastUsedMethod: LoginMethod | null;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

/** Response for login step 1 (identifier resolution). */
export interface LoginResolveResponse {
  found: boolean;
  methods: {
    password: boolean;
    passkey: boolean;
  };
  lastUsedMethod: LoginMethod | null;
}

// Re-export the WebAuthn JSON types so the client can consume them without
// reaching into `@simplewebauthn/*` directly.
export type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
