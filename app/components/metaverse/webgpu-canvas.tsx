"use client";

import type { ReactNode } from "react";
import { Canvas, extend, type ThreeToJSXElements } from "@react-three/fiber";
import * as THREE from "three/webgpu";
import { WebGPURenderer } from "three/webgpu";

// Register the WebGPU / TSL node materials (`meshStandardNodeMaterial`, etc.)
// as R3F intrinsics. This lives here (not per-scene) so every WebGPU canvas
// shares the single catalogue + type augmentation.
declare module "@react-three/fiber" {
  interface ThreeElements extends ThreeToJSXElements<typeof THREE> {}
}

extend(THREE as any);

interface WebGPUCanvasProps {
  children?: ReactNode;
  camera?: any;
}

/**
 * Shared R3F canvas configured for the WebGPU renderer + TSL pipeline.
 * Scenes that want the same rendering path as the game world render their
 * content inside this component (usually wrapped in `<EffectsSSGI>`).
 */
export function WebGPUCanvas({
  children,
  camera = { fov: 60, near: 0.5, far: 500 },
}: WebGPUCanvasProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.25]}
      camera={camera}
      gl={async (props) => {
        const renderer = new WebGPURenderer({
          ...(props as any),
          depth: true,
          antialias: true,
          stencil: false,
          requiredLimits: {
            maxColorAttachmentBytesPerSample: 64,
          },
        });
        await renderer.init();
        return renderer;
      }}
    >
      {children}
    </Canvas>
  );
}
