/** A single placed prop instance in an edited world scene. */
export interface WorldProp {
  id: string;
  name: string;
  url: string;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
}

/** A managed world/place — the "pages" of the metaverse. */
export interface World {
  id: string;
  name: string;
  description: string;
  coverUrl: string | null;
  sceneURL: string | null;
  props: WorldProp[];
  featured: boolean;
  published: boolean;
}
