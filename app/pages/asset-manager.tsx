import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft } from "lucide-react";
import { api } from "@/lib/api";
import type { World } from "../../shared/types/world";
import { useAssetManagerStore } from "@/stores/asset-manager";
import { FileManager } from "@/components/asset-manager/file-manager";
import { ChatPanel } from "@/components/asset-manager/chat-panel";

export function AssetManagerPage() {
  const { worldID } = useParams<{ worldID: string }>();
  const [world, setWorld] = useState<World | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );

  const uploadFiles = useAssetManagerStore((s) => s.uploadFiles);
  const [dragActive, setDragActive] = useState(false);
  const dragDepth = useRef(0);

  function onDragEnter(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current += 1;
    if (dragDepth.current === 1) setDragActive(true);
  }
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }
  function onDragLeave(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current -= 1;
    if (dragDepth.current <= 0) {
      dragDepth.current = 0;
      setDragActive(false);
    }
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    dragDepth.current = 0;
    setDragActive(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length > 0 && worldID) {
      uploadFiles(worldID, files);
    }
  }

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
      .catch(() => setStatus("error"));
  }, [worldID]);

  useEffect(() => {
    if (!worldID) return;
    const store = useAssetManagerStore.getState();
    store.reset();
    store.loadFiles(worldID);
    store.loadThreads(worldID).then(() => {
      const s = useAssetManagerStore.getState();
      if (s.threads.length > 0 && !s.activeThreadId) {
        s.selectThread(worldID, s.threads[0].id);
      }
    });
  }, [worldID]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950 text-white/60">
        Loading…
      </div>
    );
  }

  if (status === "error" || !world) {
    return (
      <div className="flex h-screen items-center justify-center bg-neutral-950 text-white/60">
        World not found
      </div>
    );
  }

  return (
    <div
      className="relative flex h-screen flex-col overflow-hidden bg-neutral-950 text-white"
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {dragActive && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center border-2 border-dashed border-[#0abab5] bg-[#0abab5]/10 backdrop-blur-sm">
          <p className="rounded-xl bg-neutral-900/90 px-4 py-2 text-sm font-medium text-white">
            Drop files to upload
          </p>
        </div>
      )}

      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-white/10 bg-neutral-900 px-3">
        <Link
          to={`/world/${worldID}/edit`}
          className="inline-flex items-center gap-1.5 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="size-4" /> Editor
        </Link>
        <span className="text-white/25">/</span>
        <h1 className="text-sm font-medium">Asset manager</h1>
        <span className="truncate text-sm text-white/40">{world.name}</span>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="w-80 shrink-0 border-r border-white/10 bg-neutral-900/50">
          <FileManager worldId={worldID!} />
        </div>
        <div className="min-w-0 flex-1">
          <ChatPanel worldId={worldID!} />
        </div>
      </div>
    </div>
  );
}
