import mongoose from "mongoose";
import type { HydratedDocument, Model } from "mongoose";

const { Schema, model, models } = mongoose;

/** A prop instance placed in the world scene (stored as a plain mixed array). */
export interface WorldPropDoc {
  id: string;
  name: string;
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

export interface WorldDoc {
  name: string;
  description: string;
  coverUrl: string | null;
  sceneURL: string | null;
  hdriUrl: string | null;
  environmentIntensity: number;
  props: WorldPropDoc[];
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
    hdriUrl: { type: String, default: null },
    environmentIntensity: { type: Number, default: 0.35 },
    // Stored as a plain array of objects (no per-prop _id) so client-generated
    // `id`s round-trip verbatim; validated in `normalizeProps`.
    props: { type: [Schema.Types.Mixed], default: [] } as any,
    featured: { type: Boolean, default: false },
    published: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const World: Model<WorldDoc> =
  (models.World as Model<WorldDoc> | undefined) ??
  model<WorldDoc>("World", worldSchema);
