"use client";

import { forwardRef, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three/webgpu";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

interface GLBModelProps {
  src: string;
  castShadow?: boolean;
  receiveShadow?: boolean;
}

/**
 * Loads a `.glb`/`.gltf` scene, clones it (so multiple instances can share a
 * cached source), and applies shadow flags to its meshes. Shared by the game
 * world (environment) and the editor viewport (environment + placed props).
 */
export const GLBModel = forwardRef<THREE.Group, GLBModelProps>(
  function GLBModel({ src, castShadow = true, receiveShadow = true }, ref) {
    const { scene } = useGLTF(src);
    const cloned = useMemo(() => clone(scene), [scene]);

    useEffect(() => {
      cloned.traverse((o) => {
        if ((o as THREE.Mesh).isMesh) {
          o.castShadow = castShadow;
          o.receiveShadow = receiveShadow;
        }
      });
    }, [cloned, castShadow, receiveShadow]);

    return (
      <group ref={ref}>
        <primitive object={cloned} />
      </group>
    );
  },
);
