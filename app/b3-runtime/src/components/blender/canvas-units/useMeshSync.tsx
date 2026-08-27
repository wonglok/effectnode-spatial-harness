"use client";

import { useRef, useEffect } from "react";
import * as THREE from "three";
import type { BlenderObject } from "../../types/blenderTypes";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CachedMesh {
  mesh: THREE.Mesh;
  version: string;
  /** Current geometry/material on the mesh — compared on each sync so changes
   *  can be applied in place instead of recreating the mesh node. */
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

interface InstanceSlot {
  mesh: THREE.InstancedMesh;
  index: number;
}

export interface InstancedGroupEntry {
  mesh: THREE.InstancedMesh;
  names: Set<string>;
}

/** Shallow set equality check. */
function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const v of a) if (!b.has(v)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

/** Resolved texture map for a single object. */
export interface ResolvedTextures {
  map: THREE.Texture | null;
  roughnessMap: THREE.Texture | null;
  metalnessMap: THREE.Texture | null;
  normalMap: THREE.Texture | null;
  emissiveMap: THREE.Texture | null;
}

/** Result of building geometry + material for a group of identical objects. */
export interface BuiltGeometryMaterial {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

/** What changed during a single sync run. Lets consumers distinguish a cheap
 *  transform-only update (refit the collider) from a topology / geometry change
 *  (rebuild the collider). */
export interface MeshSyncChange {
  /** Object names whose mesh node was created this run. */
  added: string[];
  /** Object names whose mesh node was removed this run. */
  removed: string[];
  /** Object names whose geometry was swapped in place. */
  geometryChanged: string[];
  /** Object names whose material was swapped in place. */
  materialChanged: string[];
  /** Object names whose transform (position/quaternion/scale) changed. */
  transformChanged: string[];
  /** True when a collider's BVH must be rebuilt (add/remove/geometry/material
   *  change). False for transform-only updates, which a per-frame refit covers. */
  needsColliderRebuild: boolean;
}

export interface MeshSyncOptions {
  scene: THREE.Scene | THREE.Object3D | THREE.Group;
  objects: BlenderObject[];
  /** Resolve all texture references for a single object.
   *  Return null for any texture that doesn't exist. */
  resolveTextures: (obj: BlenderObject) => ResolvedTextures;
  /** Compute a unique cache key that identifies the geometry + material
   *  combination. Used for grouping objects into InstancedMesh batches
   *  and for cache invalidation. */
  computeCacheKey: (obj: BlenderObject, textures: ResolvedTextures) => string;
  /** Build geometry + material for a group of objects sharing the same
   *  cache key. Called once per unique group. Return null to skip the
   *  object (e.g. when geometry data isn't available yet). */
  buildGeometryMaterial: (
    obj: BlenderObject,
    textures: ResolvedTextures,
  ) => BuiltGeometryMaterial | null;
  /** When true, never batch objects into InstancedMesh — each object becomes
   *  its own regular Mesh carrying its own matrixWorld. Required for BVH-based
   *  collision: the physics shapecast reads mesh.matrixWorld, which ignores the
   *  per-instance matrices of an InstancedMesh, so instanced colliders resolve
   *  at the wrong positions. */
  singleInstance?: boolean;
  /** Called once per sync run with a summary of what changed. */
  refresh?: (change: MeshSyncChange) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages Three.js meshes in a scene — creates, updates, batches (InstancedMesh),
 * and cleans up — driven by a reactive list of {@link BlenderObject}.
 *
 * Shared between {@link SyncViewer} (live Blender data) and
 * {@link ProductionViewer} (static zip export).
 */
export function useMeshSync({
  scene,
  objects,
  resolveTextures,
  computeCacheKey,
  buildGeometryMaterial,
  singleInstance = false,
  refresh = () => {},
}: MeshSyncOptions) {
  const meshesRef = useRef<Map<string, CachedMesh>>(new Map());
  const instancedRef = useRef<Map<string, InstancedGroupEntry>>(new Map());
  const slotsRef = useRef<Map<string, InstanceSlot>>(new Map());

  // Cache of built geometry+material, keyed by cacheKey.
  // Persists across sync runs to avoid rebuilding identical groups.
  const geoMatCache = useRef<Map<string, BuiltGeometryMaterial>>(new Map());

  // const [displayReady, setReady] = useState<any>(null);
  useEffect(() => {
    if (!scene) return;

    const meshes = meshesRef.current;
    const instanced = instancedRef.current;
    const slots = slotsRef.current;
    const incomingNames = new Set<string>();

    // Track what changed this run so consumers can decide whether to rebuild
    // a collider (add/remove/geometry swap) versus just refit (transform).
    const change: MeshSyncChange = {
      added: [],
      removed: [],
      geometryChanged: [],
      materialChanged: [],
      transformChanged: [],
      needsColliderRebuild: false,
    };

    // Resolve geometry+material from the cache, building once per cacheKey.
    const geoMatMap = geoMatCache.current;
    const resolveGeoMat = (
      cacheKey: string,
      obj: BlenderObject,
      textures: ResolvedTextures,
    ): BuiltGeometryMaterial | null => {
      const existing = geoMatMap.get(cacheKey);
      if (existing) return existing;
      const built = buildGeometryMaterial(obj, textures);
      if (!built) return null;
      geoMatMap.set(cacheKey, built);
      return built;
    };

    // ---- Phase 0: resolve textures & compute cache keys ----

    interface Resolved {
      obj: BlenderObject;
      cacheKey: string;
      textures: ResolvedTextures;
    }

    const resolved: Resolved[] = [];

    for (const obj of objects) {
      const textures = resolveTextures(obj);
      const cacheKey = computeCacheKey(obj, textures);
      resolved.push({ obj, cacheKey, textures });
    }

    // ---- Phase 1: group by cache key ----

    const groups = new Map<string, Resolved[]>();
    for (const r of resolved) {
      if (!groups.has(r.cacheKey)) groups.set(r.cacheKey, []);
      groups.get(r.cacheKey)!.push(r);
    }

    // ---- Phase 2: build / update meshes per group ----

    for (const [cacheKey, items] of groups) {
      for (const item of items) incomingNames.add(item.obj.name);

      if (items.length > 1 && !singleInstance) {
        // ================================================================
        // INSTANCED path — N objects share the same geometry + material
        // ================================================================
        const first = items[0];

        const currentNames = new Set(items.map((it) => it.obj.name));
        let entry = instanced.get(cacheKey);

        // Rebuild if membership changed or doesn't exist yet
        const needsRebuild =
          !entry ||
          entry.mesh.count !== items.length ||
          !setsEqual(entry.names, currentNames);

        if (needsRebuild) {
          // Remove old instanced mesh
          if (entry) {
            for (const n of entry.names) {
              slots.delete(n);
              change.removed.push(n);
            }
            scene.remove(entry.mesh);
          }

          // Build geometry + material (once for the group)
          const geoMat = resolveGeoMat(cacheKey, first.obj, first.textures);
          if (!geoMat) continue;

          const im = new THREE.InstancedMesh(
            geoMat.geometry,
            geoMat.material,
            items.length,
          );
          im.castShadow = true;
          im.receiveShadow = true;
          scene.add(im);

          entry = { mesh: im, names: currentNames };
          instanced.set(cacheKey, entry);
          for (const n of currentNames) change.added.push(n);
        }

        // Track slots & set instance matrices directly
        items.forEach((item, i) => {
          const name = item.obj.name;
          const matrix = new THREE.Matrix4().compose(
            new THREE.Vector3(
              item.obj.position[0],
              item.obj.position[1],
              item.obj.position[2],
            ),
            new THREE.Quaternion(
              item.obj.quaternion[0],
              item.obj.quaternion[1],
              item.obj.quaternion[2],
              item.obj.quaternion[3],
            ),
            new THREE.Vector3(
              item.obj.scale[0],
              item.obj.scale[1],
              item.obj.scale[2],
            ),
          );

          slots.set(name, { mesh: entry!.mesh, index: i });
          entry!.mesh.setMatrixAt(i, matrix);
        });

        if (entry) entry.mesh.instanceMatrix.needsUpdate = true;

        // Ensure there's no stale regular mesh for any of these objects
        if (entry) {
          for (const item of items) {
            const old = meshes.get(item.obj.name);
            if (old) {
              scene.remove(old.mesh);
              meshes.delete(item.obj.name);
              change.removed.push(item.obj.name);
            }
          }
        }
      } else {
        // ================================================================
        // SINGLE-INSTANCE path — regular Mesh
        // ================================================================
        const { obj, cacheKey, textures } = items[0];

        // Remove from any previous instanced group
        const slot = slots.get(obj.name);
        if (slot) {
          slots.delete(obj.name);
        }

        let cached = meshes.get(obj.name);

        if (!cached) {
          // First time seeing this object — create its mesh node.
          const geoMat = resolveGeoMat(cacheKey, obj, textures);
          if (!geoMat) {
            // Geometry data not ready yet — skip this object
            continue;
          }

          const mesh = new THREE.Mesh(geoMat.geometry, geoMat.material);
          mesh.name = obj.name;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          scene.add(mesh);

          cached = {
            mesh,
            version: cacheKey,
            geometry: geoMat.geometry,
            material: geoMat.material,
          };
          meshes.set(obj.name, cached);
          change.added.push(obj.name);
        } else if (cached.version !== cacheKey) {
          // Geometry / material changed — swap them in place so the mesh node
          // (and any downstream collider reference to it) survives. This avoids
          // the remove + recreate churn that would otherwise re-parent the mesh
          // and force a full BVH rebuild every time Blender edits geometry.
          const geoMat = resolveGeoMat(cacheKey, obj, textures);
          if (geoMat) {
            if (cached.geometry !== geoMat.geometry) {
              cached.mesh.geometry = geoMat.geometry;
              cached.geometry = geoMat.geometry;
              change.geometryChanged.push(obj.name);
            }
            if (cached.material !== geoMat.material) {
              cached.mesh.material = geoMat.material;
              cached.material = geoMat.material;
              change.materialChanged.push(obj.name);
            }
            cached.version = cacheKey;
          }
        }

        // Set transform in place, only touching the node when values actually
        // differ (avoids dirtying matrices / triggering re-renders needlessly).
        if (cached) {
          const m = cached.mesh;
          const [px, py, pz] = obj.position;
          const [qx, qy, qz, qw] = obj.quaternion;
          const [sx, sy, sz] = obj.scale;

          const moved =
            m.position.x !== px ||
            m.position.y !== py ||
            m.position.z !== pz ||
            m.quaternion.x !== qx ||
            m.quaternion.y !== qy ||
            m.quaternion.z !== qz ||
            m.quaternion.w !== qw ||
            m.scale.x !== sx ||
            m.scale.y !== sy ||
            m.scale.z !== sz;

          if (moved) {
            m.position.set(px, py, pz);
            m.quaternion.set(qx, qy, qz, qw);
            m.scale.set(sx, sy, sz);
            change.transformChanged.push(obj.name);
          }
        }
      }
    }

    // ---- Phase 3: cleanup ----

    // Remove stale regular meshes
    for (const [name, entry] of meshes) {
      if (!incomingNames.has(name)) {
        scene.remove(entry.mesh);
        meshes.delete(name);
        change.removed.push(name);
      }
    }

    // Remove stale instanced groups
    for (const [cacheKey, entry] of instanced) {
      if (!groups.has(cacheKey)) {
        for (const n of entry.names) {
          slots.delete(n);
          change.removed.push(n);
        }
        scene.remove(entry.mesh);
        instanced.delete(cacheKey);
      }
    }

    // Remove stale slots (objects that moved from instanced → single or removed)
    for (const [name] of slots) {
      if (!incomingNames.has(name)) {
        slots.delete(name);
      }
    }

    change.needsColliderRebuild =
      change.added.length > 0 ||
      change.removed.length > 0 ||
      change.geometryChanged.length > 0 ||
      change.materialChanged.length > 0;

    refresh(change);
  }, [scene, objects, resolveTextures, computeCacheKey, buildGeometryMaterial]);
}
