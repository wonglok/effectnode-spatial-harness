import mongoose from "mongoose";
import type { Model, Types } from "mongoose";

const { Schema, model, models } = mongoose;

export interface VerificationTokenDoc {
  user: Types.ObjectId;
  /** sha256 hex of the raw token — never store the raw token. */
  tokenHash: string;
  expiresAt: Date;
}

const verificationTokenSchema = new Schema<VerificationTokenDoc>({
  user: { type: Schema.Types.ObjectId, ref: "User", required: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true },
});

// Auto-delete expired tokens (MongoDB TTL index).
verificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const VerificationToken: Model<VerificationTokenDoc> =
  (models.VerificationToken as Model<VerificationTokenDoc> | undefined) ??
  model<VerificationTokenDoc>("VerificationToken", verificationTokenSchema);
