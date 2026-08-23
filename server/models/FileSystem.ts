import mongoose from "mongoose";
import type { HydratedDocument, Model } from "mongoose";

const { Schema, model, models } = mongoose;

export interface FileSystemDoc {
  /** Public world id (hashid) this file belongs to. */
  worldId: string;
  /** Full S3 key (e.g. `worlds/:worldID/assets/...`). */
  key: string;
  /** Original file name shown in the file manager. */
  name: string;
  /** Public URL used to load/download the file. */
  url: string;
  contentType: string;
  size: number;
  thumbnailUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type FileSystemDocument = HydratedDocument<FileSystemDoc>;

const fileSystemSchema = new Schema<FileSystemDoc>(
  {
    worldId: { type: String, required: true, index: true },
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    url: { type: String, required: true },
    contentType: { type: String, default: "application/octet-stream" },
    size: { type: Number, default: 0 },
    thumbnailUrl: { type: String, default: null },
  },
  { timestamps: true },
);

export const FileSystem: Model<FileSystemDoc> =
  (models.FileSystem as Model<FileSystemDoc> | undefined) ??
  model<FileSystemDoc>("FileSystem", fileSystemSchema);
