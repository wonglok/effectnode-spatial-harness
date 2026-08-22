/** A managed world/place — the "pages" of the metaverse. */
export interface World {
  id: string;
  name: string;
  description: string;
  coverUrl: string | null;
  sceneURL: string | null;
  featured: boolean;
  published: boolean;
}
