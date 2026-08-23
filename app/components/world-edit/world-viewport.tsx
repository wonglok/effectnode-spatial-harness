import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewcube,
  useGLTF,
} from "@react-three/drei";
import { GameWorld } from "../metaverse/world";

function WorldModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

/**
 * Blender-style 3D viewport: orbit camera, floor grid, and navigation viewcube
 * around the world's GLB scene. Uses the standard WebGL renderer so the editor
 * gizmos (grid + viewcube) work alongside the loaded model.
 */
export function WorldViewport({}: {}) {
  return <div className="absolute inset-0 bg-neutral-950"></div>;
}
