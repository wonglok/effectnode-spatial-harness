import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { api, errorMessage } from "@/lib/api";
import type { World } from "../../shared/types/world";
import { WorldViewport } from "@/components/world-edit/world-viewport";
import { WorldSettingsDialog } from "@/components/world-edit/world-settings-dialog";
import {
  ArrowLeft,
  Box,
  Grid3x3,
  Maximize,
  Move,
  MousePointer2,
  RotateCw,
  Settings,
} from "lucide-react";

// Left tool shelf — Blender-style tool affordances. Placeholders for now; the
// real editor only edits world metadata (via the settings popup).
const TOOLS = [
  { icon: MousePointer2, label: "Select" },
  { icon: Move, label: "Move" },
  { icon: RotateCw, label: "Rotate" },
  { icon: Maximize, label: "Scale" },
  { icon: Grid3x3, label: "Toggle grid" },
  { icon: Box, label: "Add object" },
];

export function WorldEditPage() {
  const { worldID } = useParams<{ worldID: string }>();
  const [world, setWorld] = useState<World | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );
  const [error, setError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (!worldID) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    api<{ world: World }>(`/api/admin/worlds/${worldID}`)
      .then((r) => {
        setWorld(r.world);
        setStatus("loaded");
      })
      .catch((err) => {
        setError(errorMessage(err));
        setStatus("error");
      });
  }, [worldID]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950 text-white/60">
        Loading world…
      </div>
    );
  }

  if (status === "error" || !world) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 bg-neutral-950 px-6 text-center">
        <h1 className="text-xl font-semibold text-white">World not found</h1>
        <p className="max-w-sm text-sm text-white/50">{error}</p>
        <Link
          to="/admin/world-manager"
          className="mt-2 text-sm font-medium text-[#0abab5] hover:underline"
        >
          Back to world manager
        </Link>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-neutral-950 text-white">
      {/* ── Top bar ─────────────────────────────────────────── */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 bg-neutral-900 px-3">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/world-manager"
            className="inline-flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white"
          >
            <ArrowLeft className="size-4" /> World manager
          </Link>
          <span className="text-white/25">/</span>
          <h1 className="truncate text-sm font-medium">{world.name}</h1>
        </div>

        <button
          onClick={() => setSettingsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
        >
          <Settings className="size-4" /> World Settings
        </button>
      </header>

      {/* ── Body: tool rail + viewport ──────────────────────── */}
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-white/10 bg-neutral-900 py-2">
          {TOOLS.map(({ icon: Icon, label }) => (
            <button
              key={label}
              title={label}
              aria-label={label}
              className="flex size-9 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Icon className="size-5" />
            </button>
          ))}
        </aside>

        <main className="relative min-w-0 flex-1">
          <WorldViewport placeURL={world.sceneURL} />
        </main>
      </div>

      {/* ── Bottom status bar ───────────────────────────────── */}
      <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-white/10 bg-neutral-900 px-3 text-xs text-white/50">
        <span className="truncate font-mono text-white/40">{world.id}</span>
        {world.featured && (
          <span className="rounded bg-[#0abab5]/20 px-1.5 py-0.5 text-[10px] font-medium text-[#2fe0da]">
            Featured
          </span>
        )}
        <span className="rounded border border-white/15 px-1.5 py-0.5 text-[10px] text-white/60">
          {world.published ? "Published" : "Draft"}
        </span>
        <span className="ml-auto text-white/30">
          Drag to orbit · Scroll to zoom
        </span>
      </footer>

      <WorldSettingsDialog
        open={settingsOpen}
        world={world}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
