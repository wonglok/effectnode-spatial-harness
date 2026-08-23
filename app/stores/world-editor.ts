import { create } from "zustand";
import type { World, WorldProp } from "../../shared/types/world";

/** An uploaded model available in the library, ready to be placed. */
export interface LibraryItem {
  id: string;
  name: string;
  url: string;
}

interface WorldEditorState {
  /** Environment GLB currently shown in the viewport. */
  sceneURL: string | null;
  /** Placed prop instances. */
  props: WorldProp[];
  /** Uploaded prop models available to drag into the scene. */
  library: LibraryItem[];
  /** Currently selected prop instance id. */
  selectedId: string | null;
  /** Library item currently being dragged from the drawer. */
  dragItem: LibraryItem | null;
  /** Whether the bottom asset drawer is expanded. */
  drawerOpen: boolean;
  saving: boolean;
  savedAt: number | null;

  init: (world: World) => void;
  setSceneURL: (url: string | null) => void;
  addLibraryItem: (item: LibraryItem) => void;
  removeLibraryItem: (id: string) => void;
  addProp: (prop: WorldProp) => void;
  updateProp: (id: string, patch: Partial<WorldProp>) => void;
  removeProp: (id: string) => void;
  selectProp: (id: string | null) => void;
  setDrawerOpen: (open: boolean) => void;
  startDrag: (item: LibraryItem) => void;
  endDrag: () => void;
  setSaving: (saving: boolean) => void;
  setSavedAt: (ts: number | null) => void;
}

export const useWorldEditorStore = create<WorldEditorState>((set) => ({
  sceneURL: null,
  props: [],
  library: [],
  selectedId: null,
  dragItem: null,
  drawerOpen: true,
  saving: false,
  savedAt: null,

  init: (world) =>
    set({
      sceneURL: world.sceneURL,
      props: world.props ?? [],
      selectedId: null,
      dragItem: null,
      saving: false,
      savedAt: null,
    }),

  setSceneURL: (url) => set({ sceneURL: url }),

  addLibraryItem: (item) =>
    set((s) => ({ library: [...s.library, item] })),

  removeLibraryItem: (id) =>
    set((s) => ({
      library: s.library.filter((i) => i.id !== id),
      dragItem: s.dragItem?.id === id ? null : s.dragItem,
    })),

  addProp: (prop) => set((s) => ({ props: [...s.props, prop] })),

  updateProp: (id, patch) =>
    set((s) => ({
      props: s.props.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })),

  removeProp: (id) =>
    set((s) => ({
      props: s.props.filter((p) => p.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),

  selectProp: (id) => set({ selectedId: id }),

  setDrawerOpen: (open) => set({ drawerOpen: open }),

  startDrag: (item) => set({ dragItem: item }),

  endDrag: () => set({ dragItem: null }),

  setSaving: (saving) => set({ saving }),

  setSavedAt: (ts) => set({ savedAt: ts }),
}));
