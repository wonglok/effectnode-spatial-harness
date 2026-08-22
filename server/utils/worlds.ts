import type { WorldDocument } from "../models/World";
import type { World } from "../../shared/types/world";
import { encodePublicId } from "./hashids";

/** Map a hydrated world document to the client-safe public shape. */
export function toPublicWorld(doc: WorldDocument): World {
  return {
    id: encodePublicId(doc._id.toString()),
    name: doc.name,
    description: doc.description ?? "",
    coverUrl: doc.coverUrl ?? null,
    sceneURL: doc.sceneURL ?? null,
    featured: doc.featured ?? false,
    published: doc.published ?? false,
  };
}
