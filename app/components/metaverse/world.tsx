"use client";

import { Suspense, useRef } from "react";
import { JoystickControls } from "./joystick-controls";
import { WebGPUCanvas } from "./webgpu-canvas";
import { EffectsSSGI } from "./render-pipeline";
import { MyScene } from "./game-scene";
import type { WorldProp } from "../../../shared/types/world";

interface GameWorldProps {
  avatarUrl?: string | null;
  placeURL?: string | null;
  /** Editor-placed props. */
  props?: WorldProp[];
  /** HDR environment map URL (null → default sky). */
  hdriUrl?: string | null;
  /** HDR environment lighting intensity. */
  environmentIntensity?: number;
  isEditor?: boolean;
}

export function GameWorld({
  avatarUrl,
  placeURL,
  props = [],
  hdriUrl,
  environmentIntensity,
}: GameWorldProps) {
  const keysRef = useRef({
    fwd: false,
    bkd: false,
    lft: false,
    rgt: false,
    space: false,
  });

  const spacePressedRef = useRef(false);

  const joystickInputRef = useRef({ active: false, angle: 0, force: 0 });

  return (
    <div className="absolute top-0  left-0 w-full h-full overflow-hidden touch-manipulation select-none">
      {/*  */}

      <WebGPUCanvas camera={{ fov: 60, near: 0.5, far: 500 }}>
        <EffectsSSGI
          hdriUrl={hdriUrl ?? undefined}
          environmentIntensity={environmentIntensity}
        >
          <Suspense fallback={null}>
            <MyScene
              keysRef={keysRef}
              spacePressedRef={spacePressedRef}
              joystickInputRef={joystickInputRef}
              avatarUrl={avatarUrl}
              placeURL={placeURL}
              props={props}
            />
          </Suspense>
        </EffectsSSGI>
      </WebGPUCanvas>

      <JoystickControls
        keysRef={keysRef}
        spacePressedRef={spacePressedRef}
        joystickInputRef={joystickInputRef}
      />

      <div className="hidden lg:block pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-2xl bg-black/30 backdrop-blur-2xl border border-white/[0.08] px-4 py-2 text-xs text-white/50 shadow-[0_4px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.06)]">
        WASD to move &middot; Space to jump &middot; Drag mouse to orbit
        &middot; Scroll to zoom
      </div>
    </div>
  );
}
