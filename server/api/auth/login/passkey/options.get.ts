import { defineEventHandler, getQuery, createError } from "nitro/h3";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { ensureDb } from "../../../../utils/mongoose";
import { User } from "../../../../models/User";
import { Passkey } from "../../../../models/Passkey";
import { getRpID, setChallengeCookie } from "../../../../utils/webauthn";

export default defineEventHandler(async (event) => {
  const identifier = String(getQuery(event).identifier ?? "")
    .trim()
    .toLowerCase();
  if (!identifier) {
    throw createError({ statusCode: 400, statusMessage: "Missing identifier" });
  }

  await ensureDb();
  const user = await User.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  });
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: "Account not found" });
  }

  const passkeys = await Passkey.find({ user: user._id });
  if (passkeys.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: "No passkeys registered for this account",
    });
  }

  const options = await generateAuthenticationOptions({
    rpID: getRpID(event),
    allowCredentials: passkeys.map((p) => ({
      id: p.credentialID,
      transports: p.transports as AuthenticatorTransportFuture[],
    })),
    userVerification: "preferred",
  });

  setChallengeCookie(event, options.challenge, "authentication", user._id.toString());
  return options;
});
