import mongoose from "mongoose";
import type { HydratedDocument, Model } from "mongoose";

const { Schema, model, models } = mongoose;

export interface WorldDoc {
  name: string;
  description: string;
  coverUrl: string | null;
  sceneURL: string | null;
  featured: boolean;
  published: boolean;
}

export type WorldDocument = HydratedDocument<WorldDoc>;

const worldSchema = new Schema<WorldDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    coverUrl: { type: String, default: null },
    sceneURL: { type: String, default: null },
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const World: Model<WorldDoc> =
  (models.World as Model<WorldDoc> | undefined) ??
  model<WorldDoc>("World", worldSchema);
