"use client";

import { useWorldEditorStore } from "@/stores/world-editor";
import { GameWorld } from "../metaverse/game-world";

const DEFAULT_ENV = "/assets/place/church.glb";

/**
 * The editor's 3D viewport. Reuses the game world so the editor previews
 * exactly what players see — environment, placed props, and HDR lighting —
 * driven by the editor store's world data.
 */
export function WorldViewport() {
  const sceneURL = useWorldEditorStore((s) => s.sceneURL);
  const props = useWorldEditorStore((s) => s.props);
  const hdriUrl = useWorldEditorStore((s) => s.hdriUrl);
  const environmentIntensity = useWorldEditorStore((s) => s.environmentIntensity);

  return (
    <GameWorld
      placeURL={sceneURL ?? DEFAULT_ENV}
      props={props}
      hdriUrl={hdriUrl}
      environmentIntensity={environmentIntensity}
    />
  );
}
