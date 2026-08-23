"use client";

import { KinematicPlatform } from "./kinematic-platform";
import { WaterPlane } from "./water-plane";
import type { MovingPlatform } from "./physics";

/** Static world dressing: water plane + animated platforms for the player to ride. */
export function ExtraContent({
  registerPlatform,
}: {
  registerPlatform: (v: MovingPlatform) => () => void;
}) {
  return (
    <>
      <WaterPlane />

      {/* Moving platforms */}
      <KinematicPlatform
        position={[6, 1, -2]}
        motion={{ axis: "x", amplitude: 5, speed: 0.25 }}
        onReady={registerPlatform}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4, 0.3, 4]} />
          <meshStandardNodeMaterial color="#e8ad40" roughness={0.3} />
        </mesh>
      </KinematicPlatform>

      <KinematicPlatform
        position={[-6, 1, -2]}
        motion={{ axis: "z", amplitude: 5, speed: 0.25 }}
        onReady={registerPlatform}
      >
        <mesh castShadow receiveShadow>
          <boxGeometry args={[4, 0.3, 4]} />
          <meshStandardNodeMaterial color="#40a4e8" roughness={0.3} />
        </mesh>
      </KinematicPlatform>
    </>
  );
}
