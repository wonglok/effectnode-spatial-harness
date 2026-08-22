import Hashids from "hashids";

/**
 * Opaque, reversible public ids for MongoDB ObjectIds. Encoding the 24-char hex
 * ObjectId hides the raw id (and the embedded creation timestamp) from URLs and
 * API responses, while staying trivially reversible on the server.
 *
 * The salt is a secret — set HASHIDS_SALT in .env / .env.local so ids can't be
 * decoded without it. The fallback below only keeps local dev working.
 */
const SALT =
  process.env.HASHIDS_SALT ||
  process.env.AUTH_SECRET ||
  "effectnode-spatial-harness";
const MIN_LENGTH = 10;

const hashids = new Hashids(SALT, MIN_LENGTH);

const OBJECT_ID_RE = /^[0-9a-f]{24}$/;

/** Encode a MongoDB ObjectId (24-char hex) into an opaque public id. */
export function encodePublicId(objectId: string): string {
  return hashids.encodeHex(objectId.toLowerCase());
}

/** Decode a public id back into an ObjectId, or null when it isn't valid. */
export function decodePublicId(publicId: string): string | null {
  try {
    const hex = hashids.decodeHex(publicId).toLowerCase();
    return OBJECT_ID_RE.test(hex) ? hex : null;
  } catch {
    return null;
  }
}
