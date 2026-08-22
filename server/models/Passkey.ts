import mongoose from "mongoose";
import type { HydratedDocument, Model, Types } from "mongoose";

const { Schema, model, models } = mongoose;

export interface PasskeyDoc {
  user: Types.ObjectId;
  /** Base64url-encoded WebAuthn credential id. */
  credentialID: string;
  /** Credential public key (COSE-encoded) — server-side only. */
  publicKey: Buffer;
  counter: number;
  transports: string[];
  deviceType: "singleDevice" | "multiDevice";
  backedUp: boolean;
  lastUsedAt: Date;
}

export type PasskeyDocument = HydratedDocument<PasskeyDoc>;

const passkeySchema = new Schema<PasskeyDoc>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    credentialID: { type: String, required: true, unique: true },
    publicKey: { type: Buffer, required: true },
    counter: { type: Number, default: 0 },
    transports: { type: [String], default: [] },
    deviceType: {
      type: String,
      enum: ["singleDevice", "multiDevice"],
      default: "singleDevice",
    },
    backedUp: { type: Boolean, default: false },
    lastUsedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

export const Passkey: Model<PasskeyDoc> =
  (models.Passkey as Model<PasskeyDoc> | undefined) ??
  model<PasskeyDoc>("Passkey", passkeySchema);
