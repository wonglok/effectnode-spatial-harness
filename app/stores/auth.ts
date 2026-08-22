import { create } from "zustand";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { api } from "@/lib/api";
import type {
  AuthUser,
  LoginMethod,
  LoginResolveResponse,
  RegisterRequest,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from "../../shared/types/auth";

const LAST_METHOD_KEY = "harness.lastMethod";

function loadLastMethods(): Record<string, LoginMethod> {
  try {
    const raw = localStorage.getItem(LAST_METHOD_KEY);
    return raw ? (JSON.parse(raw) as Record<string, LoginMethod>) : {};
  } catch {
    return {};
  }
}

function persistLastMethods(map: Record<string, LoginMethod>): void {
  try {
    localStorage.setItem(LAST_METHOD_KEY, JSON.stringify(map));
  } catch {
    // storage unavailable / full
  }
}

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface ResolvedLogin extends LoginResolveResponse {
  /** Server truth merged with the local per-browser cache. */
  effectiveLastUsed: LoginMethod | null;
}

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  /** identifier → last used method, persisted per-browser. */
  lastUsedMethods: Record<string, LoginMethod>;

  init: () => Promise<void>;
  register: (input: RegisterRequest) => Promise<void>;
  resolveIdentifier: (identifier: string) => Promise<ResolvedLogin>;
  loginPassword: (identifier: string, password: string) => Promise<void>;
  loginPasskey: (identifier: string) => Promise<void>;
  registerPasskey: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  recordMethod: (identifier: string, method: LoginMethod) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "loading",
  user: null,
  lastUsedMethods: loadLastMethods(),

  init: async () => {
    try {
      const { user } = await api<{ user: AuthUser | null }>("/api/auth/me");
      set({ user, status: user ? "authenticated" : "anonymous" });
    } catch {
      set({ user: null, status: "anonymous" });
    }
  },

  register: async (input) => {
    const { user } = await api<{ user: AuthUser }>("/api/auth/register", {
      method: "POST",
      body: input,
    });
    set({ user, status: "authenticated" });
  },

  resolveIdentifier: async (identifier) => {
    const res = await api<LoginResolveResponse>("/api/auth/login/resolve", {
      method: "POST",
      body: { identifier },
    });
    const key = identifier.trim().toLowerCase();
    const cached = get().lastUsedMethods[key] ?? null;
    return { ...res, effectiveLastUsed: res.lastUsedMethod ?? cached };
  },

  loginPassword: async (identifier, password) => {
    const { user } = await api<{ user: AuthUser }>(
      "/api/auth/login/password",
      { method: "POST", body: { identifier, password } },
    );
    get().recordMethod(identifier, "password");
    set({ user, status: "authenticated" });
  },

  loginPasskey: async (identifier) => {
    const options = await api<PublicKeyCredentialRequestOptionsJSON>(
      "/api/auth/login/passkey/options",
      { query: { identifier } },
    );
    const response = await startAuthentication({ optionsJSON: options });
    const { user } = await api<{ user: AuthUser }>(
      "/api/auth/login/passkey/verify",
      { method: "POST", body: { identifier, response } },
    );
    get().recordMethod(identifier, "passkey");
    set({ user, status: "authenticated" });
  },

  registerPasskey: async () => {
    const options = await api<PublicKeyCredentialCreationOptionsJSON>(
      "/api/auth/passkey/options",
      { method: "POST", body: {} },
    );
    const response = await startRegistration({ optionsJSON: options });
    await api<{ passkeyId: string }>("/api/auth/passkey/verify", {
      method: "POST",
      body: { response },
    });
  },

  logout: async () => {
    try {
      await api<{ ok: boolean }>("/api/auth/logout", { method: "POST", body: {} });
    } finally {
      set({ user: null, status: "anonymous" });
    }
  },

  refresh: async () => {
    const { user } = await api<{ user: AuthUser | null }>("/api/auth/me");
    set({ user, status: user ? "authenticated" : "anonymous" });
  },

  recordMethod: (identifier, method) => {
    const key = identifier.trim().toLowerCase();
    const next = { ...get().lastUsedMethods, [key]: method };
    persistLastMethods(next);
    set({ lastUsedMethods: next });
  },
}));
