import { defineEventHandler, readBody, createError } from "nitro/h3";
import { verifyRegistrationResponse } from "@simplewebauthn/server";
import type { RegistrationResponseJSON } from "@simplewebauthn/server";
import { requireAuth } from "../../../utils/auth";
import { ensureDb } from "../../../utils/mongoose";
import { Passkey } from "../../../models/Passkey";
import {
  getRpID,
  getOrigins,
  getChallengeCookie,
  clearChallengeCookie,
} from "../../../utils/webauthn";

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event);

  const body = (await readBody(event)) as
    | { response?: RegistrationResponseJSON }
    | undefined;
  const response = body?.response;
  if (!response?.id) {
    throw createError({ statusCode: 400, statusMessage: "Missing credential" });
  }

  const challengeCookie = getChallengeCookie(event);
  if (
    !challengeCookie ||
    challengeCookie.kind !== "registration" ||
    challengeCookie.userId !== user._id.toString()
  ) {
    throw createError({
      statusCode: 400,
      statusMessage: "Invalid or expired challenge",
    });
  }

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response,
      expectedChallenge: challengeCookie.challenge,
      expectedOrigin: getOrigins(event),
      expectedRPID: getRpID(event),
      requireUserVerification: false,
    });
  } catch {
    throw createError({
      statusCode: 400,
      statusMessage: "Passkey verification failed",
    });
  }

  if (!verification.verified) {
    throw createError({ statusCode: 400, statusMessage: "Passkey verification failed" });
  }

  const { credential, credentialDeviceType, credentialBackedUp } =
    verification.registrationInfo;

  await ensureDb();
  await Passkey.create({
    user: user._id,
    credentialID: credential.id,
    publicKey: Buffer.from(credential.publicKey),
    counter: credential.counter,
    transports: credential.transports ?? [],
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
  });

  clearChallengeCookie(event);
  return { passkeyId: credential.id };
});
