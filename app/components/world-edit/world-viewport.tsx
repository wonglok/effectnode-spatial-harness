import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  GizmoHelper,
  GizmoViewcube,
  useGLTF,
} from "@react-three/drei";

function WorldModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

/**
 * Blender-style 3D viewport: orbit camera, floor grid, and navigation viewcube
 * around the world's GLB scene. Uses the standard WebGL renderer so the editor
 * gizmos (grid + viewcube) work alongside the loaded model.
 */
export function WorldViewport({ placeURL }: { placeURL?: string | null }) {
  return (
    <div className="absolute inset-0 bg-neutral-950">
      <Canvas
        shadows
        dpr={[1, 1.25]}
        camera={{ fov: 60, near: 0.1, far: 1000, position: [14, 12, 14] }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[20, 35, 40]} intensity={2} castShadow />

        <Suspense fallback={null}>{placeURL && <WorldModel url={placeURL} />}</Suspense>

        <Grid
          args={[100, 100]}
          cellSize={1}
          cellThickness={0.6}
          cellColor="#2a2a2a"
          sectionSize={5}
          sectionThickness={1.1}
          sectionColor="#0abab5"
          fadeDistance={120}
          fadeStrength={1}
          infiniteGrid
          position={[0, 0, 0]}
        />

        <OrbitControls makeDefault enableDamping dampingFactor={0.08} />

        <GizmoHelper alignment="bottom-right" margin={[80, 80]}>
          <GizmoViewcube />
        </GizmoHelper>
      </Canvas>
    </div>
  );
}
