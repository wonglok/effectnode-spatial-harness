import { defineEventHandler } from "nitro/h3";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { requireAuth } from "../../../utils/auth";
import { ensureDb } from "../../../utils/mongoose";
import { Passkey } from "../../../models/Passkey";
import { getRpID, setChallengeCookie } from "../../../utils/webauthn";

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event);
  await ensureDb();

  const existing = await Passkey.find({ user: user._id });

  const options = await generateRegistrationOptions({
    rpName: "3D & AI Harness",
    rpID: getRpID(event),
    userName: user.username,
    userDisplayName: user.username,
    // Stable, never-changing identifier — ties the credential to this account.
    userID: new TextEncoder().encode(user._id.toString()),
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({
      id: p.credentialID,
      transports: p.transports as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
  });

  setChallengeCookie(event, options.challenge, "registration", user._id.toString());
  return options;
});
