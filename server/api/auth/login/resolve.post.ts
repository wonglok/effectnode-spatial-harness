import { defineEventHandler, readBody } from "nitro/h3";
import { ensureDb } from "../../../utils/mongoose";
import { User } from "../../../models/User";
import { Passkey } from "../../../models/Passkey";
import { isRootAdminIdentifier, isRootAdminLoginEnabled } from "../../../utils/root-admin";
import type { LoginResolveResponse } from "../../../../shared/types/auth";

const EMPTY: LoginResolveResponse = {
  found: false,
  methods: { password: false, passkey: false },
  lastUsedMethod: null,
};

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as
    | { identifier?: unknown }
    | undefined;
  const identifier = String(body?.identifier ?? "").trim().toLowerCase();

  if (!identifier) return EMPTY;

  await ensureDb();
  const user = await User.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  });

  const isDevRoot = isRootAdminLoginEnabled() && isRootAdminIdentifier(identifier);

  if (!user && !isDevRoot) return EMPTY;

  const passkeyCount = user ? await Passkey.countDocuments({ user: user._id }) : 0;

  return {
    found: true,
    methods: {
      password: isDevRoot ? true : !!user?.passwordHash,
      passkey: passkeyCount > 0,
    },
    lastUsedMethod: user?.lastUsedMethod ?? null,
  } satisfies LoginResolveResponse;
});
