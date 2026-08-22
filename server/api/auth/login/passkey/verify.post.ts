import { defineEventHandler, readBody, createError } from "nitro/h3";
import { verifyAuthenticationResponse } from "@simplewebauthn/server";
import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from "@simplewebauthn/server";
import { ensureDb } from "../../../../utils/mongoose";
import { User } from "../../../../models/User";
import { Passkey } from "../../../../models/Passkey";
import {
  getRpID,
  getOrigins,
  getChallengeCookie,
  clearChallengeCookie,
} from "../../../../utils/webauthn";
import { setSessionCookie, toPublicUser } from "../../../../utils/session";

export default defineEventHandler(async (event) => {
  const body = (await readBody(event)) as
    | { identifier?: unknown; response?: AuthenticationResponseJSON }
    | undefined;
  const identifier = String(body?.identifier ?? "").trim().toLowerCase();
  const response = body?.response;

  if (!identifier || !response?.id) {
    throw createError({ statusCode: 400, statusMessage: "Missing fields" });
  }

  const challengeCookie = getChallengeCookie(event);
  if (!challengeCookie || challengeCookie.kind !== "authentication") {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid or expired challenge",
    });
  }

  await ensureDb();
  const user = await User.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  });
  if (!user) {
    throw createError({ statusCode: 404, statusMessage: "Account not found" });
  }

  const passkey = await Passkey.findOne({
    user: user._id,
    credentialID: response.id,
  });
  if (!passkey) {
    throw createError({ statusCode: 400, statusMessage: "Credential not found" });
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challengeCookie.challenge,
      expectedOrigin: getOrigins(event),
      expectedRPID: getRpID(event),
      credential: {
        id: passkey.credentialID,
        publicKey: new Uint8Array(passkey.publicKey),
        counter: passkey.counter,
        transports: passkey.transports as AuthenticatorTransportFuture[],
      },
      requireUserVerification: false,
    });
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Passkey verification failed",
    });
  }

  if (!verification.verified) {
    throw createError({ statusCode: 401, statusMessage: "Passkey verification failed" });
  }

  const { newCounter, credentialDeviceType, credentialBackedUp } =
    verification.authenticationInfo;

  passkey.counter = newCounter;
  passkey.deviceType = credentialDeviceType;
  passkey.backedUp = credentialBackedUp;
  passkey.lastUsedAt = new Date();
  await passkey.save();

  user.lastUsedMethod = "passkey";
  await user.save();

  await setSessionCookie(event, user._id.toString(), user.role);
  clearChallengeCookie(event);
  return { user: toPublicUser(user) };
});
