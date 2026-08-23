import mongoose from "mongoose";
import type { HydratedDocument, Model } from "mongoose";

const { Schema, model, models } = mongoose;

export interface ChatThreadDoc {
  /** Public world id (hashid) this thread belongs to. */
  worldId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessageDoc {
  threadId: mongoose.Types.ObjectId;
  role: "system" | "user" | "assistant";
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export type ChatThreadDocument = HydratedDocument<ChatThreadDoc>;
export type ChatMessageDocument = HydratedDocument<ChatMessageDoc>;

const chatThreadSchema = new Schema<ChatThreadDoc>(
  {
    worldId: { type: String, required: true, index: true },
    title: { type: String, default: "New chat", trim: true, maxlength: 200 },
  },
  { timestamps: true },
);

const chatMessageSchema = new Schema<ChatMessageDoc>(
  {
    threadId: {
      type: Schema.Types.ObjectId,
      ref: "ChatThread",
      required: true,
      index: true,
    },
    role: {
      type: String,
      enum: ["system", "user", "assistant"],
      required: true,
    },
    content: { type: String, default: "" },
  },
  { timestamps: true },
);

export const ChatThread: Model<ChatThreadDoc> =
  (models.ChatThread as Model<ChatThreadDoc> | undefined) ??
  model<ChatThreadDoc>("ChatThread", chatThreadSchema);

export const ChatMessage: Model<ChatMessageDoc> =
  (models.ChatMessage as Model<ChatMessageDoc> | undefined) ??
  model<ChatMessageDoc>("ChatMessage", chatMessageSchema);
