"use client";

import { useEffect, useMemo, useCallback } from "react";
import { useThree } from "@react-three/fiber";
import { useBlenderStore } from "../../stores/blenderStore";
import {
  _geoMaterialCache,
  getOrCreateTexture,
  buildGeometryFromBuffer,
  computeMeshCacheKey,
} from "../../utils/meshBuilder";
import type { BlenderObject } from "../../types/blenderTypes";
import { LightFromData } from "../canvas-units/LightFromData";
import {
  useMeshSync,
  type ResolvedTextures,
} from "../canvas-units/useMeshSync";
import { useEnvironmentMap } from "../canvas-units/useEnvironmentMap";

// ---------------------------------------------------------------------------
// Viewer
// ---------------------------------------------------------------------------

import { useBlenderSyncStore } from "../../stores/blenderSyncStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { Group, Object3D, Scene } from "three";
// import { Object3D, Scene } from "three";

export function RefreshButton({
  className = "block px-3 py-1 text-white text-sm bg-blue-500 rounded-lg m-1",
}) {
  let connectionState = useBlenderStore((r) => r.connectionState);
  return (
    <>
      <button
        onClick={() => {
          //
          useBlenderSyncStore.getState().refresh();
        }}
        className={className}
      >
        Refresh{" "}
        {connectionState === "connected" ? `[Connected]` : `[Disconnected]`}
      </button>
    </>
  );
}

export function BlenderConnection() {
  const disconnect = useBlenderSyncStore((s) => s.disconnect);

  // Hydrate persisted settings from localStorage on the client (SSR-safe)
  const hydrate = useSettingsStore((s) => s.hydrate);
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Connect to Blender WebSocket on mount, disconnect on unmount
  useEffect(() => {
    const connectFn = useBlenderSyncStore.getState().connect;
    connectFn();

    return () => {
      disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <></>;
}

export interface SyncViewerProps {
  /** When provided, the synced mesh container is handed to the caller instead
   *  of being attached to the scene directly — use this to wrap the Blender
   *  meshes in a collider (e.g. KinematicPlatform). The container starts empty
   *  and fills in as Blender data streams over the WebSocket. Meshes are built
   *  without InstancedMesh batching so each object carries its own matrixWorld
   *  — required for BVH collision. */
  onSyncGroup?: (group: Object3D) => void;
}

export function SyncViewer({ onSyncGroup }: SyncViewerProps = {}) {
  const sceneData = useBlenderStore((s) => s.sceneData);
  const hdrData = useBlenderStore((s) => s.hdrData);
  const hdrIntensity = useBlenderStore((s) => s.hdrIntensity);
  const texData = useBlenderStore((s) => s.texData);
  const geoBuffers = useBlenderStore((s) => s.geoBuffers);
  const lights = useBlenderStore((s) => s.lights);

  const scene = useThree((r) => r.scene);

  const gl = useThree((r) => r.gl);

  // ------------------------------------------------------------------
  // Apply HDR environment map + intensity (shared hook)
  // ------------------------------------------------------------------
  useEnvironmentMap({
    scene: scene!,
    renderer: gl,
    hdrPixels: hdrData?.pixels,
    intensity: hdrIntensity,
    background: true,
    fallbackColor: "#f4f4f4",
  });

  const group = useMemo(() => {
    let o3d = new Object3D();

    return {
      display: <primitive object={o3d}></primitive>,
      o3d: o3d,
    };
  }, []);

  // ------------------------------------------------------------------
  // Sync meshes from Blender data (with InstancedMesh batching)
  // ------------------------------------------------------------------
  // Callbacks are memoized so useMeshSync's effect only re-runs when Blender
  // data actually changes. Passing inline arrows would re-run the sync on every
  // SyncViewer render — including the collider-rebuild cycle triggered below by
  // refresh → onSyncGroup — which would call refresh again and loop forever.
  const resolveTextures = useCallback(
    (obj: BlenderObject): ResolvedTextures => ({
      map: obj.texture
        ? getOrCreateTexture(obj.texture, texData, "color")
        : null,
      roughnessMap: obj.roughnessMap
        ? getOrCreateTexture(obj.roughnessMap, texData, "noncolor")
        : null,
      metalnessMap: obj.metalnessMap
        ? getOrCreateTexture(obj.metalnessMap, texData, "noncolor")
        : null,
      normalMap: obj.normalMap
        ? getOrCreateTexture(obj.normalMap, texData, "noncolor")
        : null,
      emissiveMap: obj.emissiveMap
        ? getOrCreateTexture(obj.emissiveMap, texData, "color")
        : null,
    }),
    [texData],
  );

  const computeCacheKey = useCallback(
    (obj: BlenderObject, textures: ResolvedTextures) => {
      const geoBuf = geoBuffers.get(obj.name);
      return computeMeshCacheKey(
        obj.name,
        obj.version,
        geoBuf?.version,
        textures.map,
        textures.roughnessMap,
        textures.metalnessMap,
        textures.normalMap,
        textures.emissiveMap,
      );
    },
    [geoBuffers],
  );

  const buildGeometryMaterial = useCallback(
    (obj: BlenderObject, textures: ResolvedTextures) => {
      const geoBuf = geoBuffers.get(obj.name);
      if (!geoBuf || geoBuf.version !== obj.version) return null;

      const geoName = (obj as any).geometry ?? obj.name;
      const cacheKey = computeMeshCacheKey(
        geoName,
        obj.version,
        geoBuf.version,
        textures.map,
        textures.roughnessMap,
        textures.metalnessMap,
        textures.normalMap,
        textures.emissiveMap,
      );

      let geoMat = _geoMaterialCache.get(cacheKey);
      if (!geoMat) {
        geoMat = buildGeometryFromBuffer({
          buf: geoBuf,
          color: obj.color,
          roughness: obj.roughness ?? 0.5,
          metalness: obj.metalness ?? 0.0,
          emissiveColor: obj.emissiveColor ?? [0, 0, 0],
          emissiveIntensity: obj.emissiveIntensity ?? 0.0,
          map: textures.map,
          roughnessMap: textures.roughnessMap,
          metalnessMap: textures.metalnessMap,
          normalMap: textures.normalMap,
          emissiveMap: textures.emissiveMap,
          transparent: obj.transparent,
          opacity: obj.opacity,
          alphaTest: obj.alphaTest,
          flatShading: obj.flatShading,
          graph: obj.graph,
        }) as any;
        _geoMaterialCache.set(cacheKey, geoMat as any);
      }

      return geoMat as any;
    },
    [geoBuffers],
  );

  // Fired by useMeshSync after every sync run — hand the container back so the
  // caller can rebuild its collider. The container itself is stable; the call
  // is the "data changed" signal.
  const handleRefresh = useCallback(
    (_v: any) => {
      if (onSyncGroup) onSyncGroup(group.o3d);
    },
    [onSyncGroup, group],
  );

  useMeshSync({
    scene: group.o3d!,
    objects: sceneData.objects,
    // Colliders need plain meshes — InstancedMesh per-instance transforms
    // are not reflected in matrixWorld, which physics reads for collision.
    singleInstance: !!onSyncGroup,
    refresh: handleRefresh,
    resolveTextures,
    computeCacheKey,
    buildGeometryMaterial,
  });

  // Blender energy (Watts) → Three.js intensity conversion.
  // Multiply by 4π to convert radiant flux to luminous intensity,
  // then divide by 25 to bring values into a practical range.
  const ENERGY_SCALE = 1 / 10;

  return (
    <group>
      {/* When handing the sync container to a caller (collider mode), the
          caller attaches it — otherwise attach it here for plain display. */}
      {!onSyncGroup && group.display}

      {/* Lights from Blender — declarative via shared LightFromData */}
      {lights.map((light) => (
        <LightFromData
          key={light.name}
          light={light}
          intensityScale={ENERGY_SCALE}
        />
      ))}
    </group>
  );
}
