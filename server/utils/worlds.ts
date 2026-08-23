import { randomUUID } from "node:crypto";
import type { WorldDocument, WorldPropDoc } from "../models/World";
import type { World, WorldProp } from "../../shared/types/world";
import { encodePublicId } from "./hashids";

type Vec3 = [number, number, number];

function toVec3(value: unknown, fallback: Vec3): Vec3 {
  if (Array.isArray(value)) {
    return [
      Number(value[0] ?? fallback[0]),
      Number(value[1] ?? fallback[1]),
      Number(value[2] ?? fallback[2]),
    ];
  }
  return fallback;
}

/** Coerce an untrusted prop payload into a clean, persisted prop document. */
export function normalizeProps(input: unknown): WorldPropDoc[] {
  if (!Array.isArray(input)) return [];
  const out: WorldPropDoc[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const url = String(o.url ?? "").trim();
    if (!url) continue;
    out.push({
      id: String(o.id ?? "").trim() || `p_${randomUUID()}`,
      name: String(o.name ?? "").slice(0, 120),
      url,
      position: toVec3(o.position, [0, 0, 0]),
      rotation: toVec3(o.rotation, [0, 0, 0]),
      scale: toVec3(o.scale, [1, 1, 1]),
    });
  }
  return out;
}

function toPublicProp(raw: unknown): WorldProp {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  return {
    id: String(o.id ?? ""),
    name: String(o.name ?? ""),
    url: String(o.url ?? ""),
    position: toVec3(o.position, [0, 0, 0]),
    rotation: toVec3(o.rotation, [0, 0, 0]),
    scale: toVec3(o.scale, [1, 1, 1]),
  };
}

/** Map a hydrated world document to the client-safe public shape. */
export function toPublicWorld(doc: WorldDocument): World {
  return {
    id: encodePublicId(doc._id.toString()),
    name: doc.name,
    description: doc.description ?? "",
    coverUrl: doc.coverUrl ?? null,
    sceneURL: doc.sceneURL ?? null,
    props: Array.isArray(doc.props) ? doc.props.map(toPublicProp) : [],
    featured: doc.featured ?? false,
    published: doc.published ?? false,
  };
}
