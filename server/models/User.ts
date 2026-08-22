import mongoose from "mongoose";
import type { HydratedDocument, Model } from "mongoose";
import type { LoginMethod, UserRole } from "../../shared/types/auth";

const { Schema, model, models } = mongoose;

export const USER_ROLES: UserRole[] = ["admin", "editor", "public"];

export interface UserDoc {
  username: string;
  email: string;
  emailVerified: boolean;
  passwordHash: string | null;
  avatarUrl: string | null;
  role: UserRole;
  lastUsedMethod: LoginMethod | null;
}

export type UserDocument = HydratedDocument<UserDoc>;

const userSchema = new Schema<UserDoc>(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      minlength: 3,
      maxlength: 24,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    emailVerified: { type: Boolean, default: false },
    passwordHash: { type: String, default: null },
    avatarUrl: { type: String, default: null },
    role: { type: String, enum: USER_ROLES, default: "public", index: true },
    lastUsedMethod: {
      type: String,
      enum: ["password", "passkey"],
      default: null,
    },
  },
  { timestamps: true },
);

// `models.User` guards against duplicate model registration across HMR/reloads.
export const User: Model<UserDoc> =
  (models.User as Model<UserDoc> | undefined) ??
  model<UserDoc>("User", userSchema);
