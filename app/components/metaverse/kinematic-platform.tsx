import { useEffect, useRef, useCallback, type ReactNode } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshBVH, ObjectBVH } from "three-mesh-bvh";
import type { MovingPlatform } from "./physics";

interface KinematicPlatformProps {
  /** GLB model URL. If omitted, children are used as the platform geometry. */
  url?: string;
  scale?: number;
  position?: [number, number, number];
  /** Oscillation axis + amplitude + speed */
  motion?: {
    axis: "x" | "y" | "z";
    amplitude: number;
    speed: number; // radians per second
  };
  /** Register this platform with the physics loop.
   *  Return the unregister function from onReady to handle cleanup. */
  onReady?: (platform: MovingPlatform) => () => void;
  children?: ReactNode;
  /** When this value changes after mount, the BVH collider is rebuilt from the
   *  current children. Use for asynchronously-populated scenes (e.g. Blender
   *  mesh sync) where meshes are added / moved / replaced over time — refit()
   *  only handles transform changes, not topology changes. */
  rebuildSignal?: unknown;
}

/**
 * A platform that loads a GLB model (or uses procedural children),
 * builds BVH for collision, and animates along a sine-wave axis.
 *
 * Refits the BVH each frame so shapecast stays accurate.
 * Exposes world-space velocity to the physics loop so the player
 * can ride the platform.
 */
export function KinematicPlatform({
  url,
  // scale = 1,
  position = [0, 0, 0],
  motion = { axis: "x", amplitude: 0, speed: 0 },
  onReady,
  rebuildSignal,
  children,
  scale = 1,
}: KinematicPlatformProps) {
  // const { scene } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const bvhRef = useRef<ObjectBVH | null>(null);
  const velocity = useRef(new THREE.Vector3());
  const unregisterRef = useRef<(() => void) | null>(null);
  // Set once the initial collider is built — rebuildSignal only triggers
  // rebuilds, never the very first build (the "ready" poll owns that).
  const hasBuiltRef = useRef(false);
  // Number of collidable meshes the current BVH was built from. Compared each
  // frame so a mesh appearing/disappearing (Blender geometry still streaming in)
  // triggers a rebuild even if the rebuildSignal plumbing misses it.
  const lastMeshCountRef = useRef(0);

  const buildBVH = useCallback(() => {
    const group = groupRef.current;
    if (!group) return;

    // Tear down the previous collider before rebuilding
    unregisterRef.current?.();
    unregisterRef.current = null;
    bvhRef.current = null;

    let meshCount = 0;
    group.traverse((c) => {
      const mesh = c as THREE.Mesh;
      if (!mesh.isMesh) return;
      meshCount++;
      if (!mesh.geometry.boundsTree) {
        mesh.geometry.boundsTree = new MeshBVH(mesh.geometry);
      }
    });

    // No collidable meshes yet — mark as built and remember the empty state so
    // a later mesh arrival (detected in useFrame or via rebuildSignal) rebuilds.
    hasBuiltRef.current = true;
    lastMeshCountRef.current = meshCount;
    if (meshCount === 0) return;

    group.updateMatrixWorld(true);

    const bvh = new ObjectBVH(group, { maxLeafTris: 1 });
    bvhRef.current = bvh;

    const platform: MovingPlatform = {
      group,
      bvh,
      velocity: velocity.current,
    };
    unregisterRef.current = onReady?.(platform) ?? null;
  }, [onReady]);

  // Build BVH from children once they're in the group (or after GLB load)
  useEffect(() => {
    let clean = () => {};

    let tt = setInterval(() => {
      if (groupRef.current?.getObjectByName("ready")) {
        clearInterval(tt);
        // if (url) return; // wait for GLB loader if URL is set
        if (!children) return;

        // Allow one frame for R3F to populate the group with child meshes
        const id = setTimeout(() => {
          buildBVH();
        }, 5);

        clean();
        clean = () => clearTimeout(id);
      }
    }, 10);

    return () => {
      clearInterval(tt);
      clean();
    };
  }, [children, url, buildBVH]);

  // Unregister from the physics loop on unmount
  useEffect(() => {
    return () => {
      unregisterRef.current?.();
      unregisterRef.current = null;
    };
  }, []);

  // Rebuild the collider whenever the sync source reports a change. The next
  // frame guarantees any reparenting / mesh updates have committed first.
  useEffect(() => {
    if (!hasBuiltRef.current) return;
    const id = setTimeout(() => buildBVH(), 0);
    return () => clearTimeout(id);
  }, [rebuildSignal, buildBVH]);

  // Animate using wall-clock time so all peers stay in sync without network
  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;

    const t = Date.now() / 1000; // seconds since epoch
    const axis = motion.axis;
    const { amplitude, speed } = motion;
    const phase = t * speed;

    // Position: base + amplitude * sin(time * speed)
    const offset = Math.sin(phase) * amplitude;
    const velValue = Math.cos(phase) * amplitude * speed; // analytical derivative

    if (axis === "x") {
      group.position.x = position[0] + offset;
      velocity.current.set(velValue, 0, 0);
    } else if (axis === "y") {
      group.position.y = position[1] + offset;
      velocity.current.set(0, velValue, 0);
    } else {
      group.position.z = position[2] + offset;
      velocity.current.set(0, 0, velValue);
    }

    // Sync non-moving axes to base position
    if (axis !== "x") group.position.x = position[0];
    if (axis !== "y") group.position.y = position[1];
    if (axis !== "z") group.position.z = position[2];

    // Detect topology changes (meshes added / removed) by their count and
    // rebuild. refit() only handles transforms, so it can't pick up a new mesh
    // that arrived after the initial (possibly empty) build. This is a cheap
    // fallback alongside the explicit rebuildSignal path.
    let meshCount = 0;
    group.traverse((c) => {
      if ((c as THREE.Mesh).isMesh) meshCount++;
    });

    if (meshCount !== lastMeshCountRef.current) {
      buildBVH();
    } else {
      // Refit BVH so shapecast sees the updated position.
      group.updateMatrixWorld();
      bvhRef.current?.refit();
    }
  });

  return <group ref={groupRef}>{children}</group>;
}
