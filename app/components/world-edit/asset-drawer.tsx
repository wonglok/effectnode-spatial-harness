"use client";

import { useRef, useState } from "react";
import {
  ChevronDown,
  Globe,
  GripVertical,
  Package,
  Save,
  Sun,
  Trash2,
  Upload,
} from "lucide-react";
import { useWorldEditorStore, type LibraryItem } from "@/stores/world-editor";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

type Tab = "environment" | "props" | "lighting";

/** Presign + upload a single model file to the world-assets bucket. */
async function uploadWorldAsset(
  file: File,
): Promise<{ publicUrl: string; name: string }> {
  const res = await api<{
    uploadUrl: string;
    publicUrl: string;
    contentType: string;
  }>("/api/admin/worlds/assets/presign", {
    method: "POST",
    body: { filename: file.name },
  });

  await fetch(res.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": res.contentType },
  });

  return { publicUrl: res.publicUrl, name: file.name };
}

const tabBtn = (active: boolean) =>
  cn(
    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
    active
      ? "bg-white/10 text-white"
      : "text-white/50 hover:bg-white/5 hover:text-white",
  );

function ModelThumb() {
  return (
    <div
      className="flex size-14 items-center justify-center rounded-lg text-white"
      style={{
        backgroundImage:
          "linear-gradient(135deg, #0abab5 0%, #3bb6d8 60%, #9b8af0 100%)",
      }}
    >
      <Package className="size-6 opacity-90" />
    </div>
  );
}

function LibraryCard({
  item,
  onDelete,
}: {
  item: LibraryItem;
  onDelete: (id: string) => void;
}) {
  const startDrag = useWorldEditorStore((s) => s.startDrag);
  const endDrag = useWorldEditorStore((s) => s.endDrag);

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("text/plain", item.id);
        e.dataTransfer.effectAllowed = "copy";
        startDrag(item);
      }}
      onDragEnd={() => endDrag()}
      className="group relative flex w-24 cursor-grab flex-col items-center gap-1.5 rounded-xl border border-white/10 bg-white/4 p-2 transition-colors hover:border-white/20 hover:bg-white/8 active:cursor-grabbing"
    >
      <button
        onClick={() => onDelete(item.id)}
        title="Remove from library"
        aria-label="Remove from library"
        className="absolute -right-1.5 -top-1.5 hidden size-5 items-center justify-center rounded-full bg-neutral-800 text-white/50 ring-1 ring-white/10 transition-colors hover:bg-red-500/20 hover:text-red-400 group-hover:flex"
      >
        <Trash2 className="size-3" />
      </button>
      <ModelThumb />
      <span className="w-full truncate text-center text-[11px] text-white/60">
        {item.name}
      </span>
    </div>
  );
}

function PlacedPropRow({
  name,
  selected,
  onSelect,
  onDelete,
}: {
  name: string;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
        selected
          ? "bg-[#0abab5]/15 text-white"
          : "text-white/60 hover:bg-white/5 hover:text-white",
      )}
    >
      <GripVertical className="size-3.5 shrink-0 text-white/25" />
      <Package className="size-3.5 shrink-0 text-white/40" />
      <span className="min-w-0 flex-1 truncate">{name}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Remove prop"
        aria-label="Remove prop"
        className="rounded p-1 text-white/30 transition-colors hover:bg-red-500/20 hover:text-red-400"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

export function AssetDrawer() {
  const open = useWorldEditorStore((s) => s.drawerOpen);
  const setOpen = useWorldEditorStore((s) => s.setDrawerOpen);
  const sceneURL = useWorldEditorStore((s) => s.sceneURL);
  const setSceneURL = useWorldEditorStore((s) => s.setSceneURL);
  const library = useWorldEditorStore((s) => s.library);
  const addLibraryItem = useWorldEditorStore((s) => s.addLibraryItem);
  const removeLibraryItem = useWorldEditorStore((s) => s.removeLibraryItem);
  const props = useWorldEditorStore((s) => s.props);
  const selectedId = useWorldEditorStore((s) => s.selectedId);
  const selectProp = useWorldEditorStore((s) => s.selectProp);
  const removeProp = useWorldEditorStore((s) => s.removeProp);
  const saving = useWorldEditorStore((s) => s.saving);
  const persist = useWorldEditorStore((s) => s.persist);
  const hdriUrl = useWorldEditorStore((s) => s.hdriUrl);
  const setHdriUrl = useWorldEditorStore((s) => s.setHdriUrl);
  const environmentIntensity = useWorldEditorStore(
    (s) => s.environmentIntensity,
  );
  const setEnvironmentIntensity = useWorldEditorStore(
    (s) => s.setEnvironmentIntensity,
  );

  const [tab, setTab] = useState<Tab>("props");
  const [busy, setBusy] = useState<Tab | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const envInputRef = useRef<HTMLInputElement>(null);
  const propInputRef = useRef<HTMLInputElement>(null);
  const hdrInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined, kind: Tab) {
    if (!file) return;
    setError(null);
    setNotice(null);
    setBusy(kind);
    try {
      const { publicUrl, name } = await uploadWorldAsset(file);
      if (kind === "environment") {
        setSceneURL(publicUrl);
        setNotice("Environment updated — press Save to persist.");
      } else if (kind === "lighting") {
        setHdriUrl(publicUrl);
        setNotice("HDR updated — press Save to persist.");
      } else {
        addLibraryItem({ id: crypto.randomUUID(), name, url: publicUrl });
        setNotice(`Added “${name}”. Drag it onto the scene to place it.`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
      if (envInputRef.current) envInputRef.current.value = "";
      if (propInputRef.current) propInputRef.current.value = "";
      if (hdrInputRef.current) hdrInputRef.current.value = "";
    }
  }

  async function save() {
    setError(null);
    setNotice(null);
    try {
      await persist();
      setNotice("Saved.");
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="overflow-hidden rounded-t-2xl border border-white/10 bg-neutral-900/95 shadow-[0_-8px_40px_rgba(0,0,0,0.5)] backdrop-blur-xl">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex h-11 shrink-0 items-center gap-2 px-3">
        <button
          onClick={() => setOpen(!open)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ChevronDown
            className={cn("size-4 transition-transform", !open && "-rotate-90")}
          />
          <span className="text-sm font-semibold">Scene assets</span>
        </button>

        <div className="ml-2 flex items-center gap-1">
          <button
            className={tabBtn(tab === "environment")}
            onClick={() => setTab("environment")}
          >
            <Globe className="size-3.5" /> Environment
          </button>
          <button
            className={tabBtn(tab === "lighting")}
            onClick={() => setTab("lighting")}
          >
            <Sun className="size-3.5" /> Lighting
          </button>
          <button
            className={tabBtn(tab === "props")}
            onClick={() => setTab("props")}
          >
            <Package className="size-3.5" /> Props
            <span className="text-white/30">({props.length})</span>
          </button>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-[#0abab5] px-3 py-1.5 text-xs font-semibold text-black transition-colors hover:bg-[#0cc9c3] disabled:opacity-50"
        >
          <Save className="size-3.5" /> {saving ? "Saving…" : "Save"}
        </button>
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      {open && (
        <div className="max-h-52 overflow-y-auto border-t border-white/10 px-3 py-3">
          {(error || notice) && (
            <p
              className={cn(
                "mb-2 text-xs",
                error ? "text-red-400" : "text-[#2fe0da]",
              )}
            >
              {error ?? notice}
            </p>
          )}

          {tab === "environment" ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-white/50">
                Upload a <code className="text-white/70">.glb</code> or{" "}
                <code className="text-white/70">.gltf</code> environment. It
                replaces the world&apos;s scene.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => envInputRef.current?.click()}
                  disabled={busy === "environment"}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50"
                >
                  <Upload className="size-3.5" />
                  {busy === "environment" ? "Uploading…" : "Upload environment"}
                </button>
                {sceneURL && (
                  <>
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/40">
                      {sceneURL}
                    </span>
                    <button
                      onClick={() => setSceneURL(null)}
                      title="Reset to default scene"
                      className="rounded p-1 text-white/40 transition-colors hover:text-white"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                )}
              </div>
              <input
                ref={envInputRef}
                type="file"
                accept=".glb,.gltf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0], "environment")}
              />
            </div>
          ) : tab === "lighting" ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-white/50">
                Upload an <code className="text-white/70">.hdr</code>{" "}
                environment map and tune its lighting intensity.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => hdrInputRef.current?.click()}
                  disabled={busy === "lighting"}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50"
                >
                  <Upload className="size-3.5" />
                  {busy === "lighting" ? "Uploading…" : "Upload HDR"}
                </button>
                {hdriUrl && (
                  <>
                    <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/40">
                      {hdriUrl}
                    </span>
                    <button
                      onClick={() => setHdriUrl(null)}
                      title="Reset to default sky"
                      className="rounded p-1 text-white/40 transition-colors hover:text-white"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </>
                )}
              </div>

              <label className="flex items-center gap-3 text-xs text-white/60">
                <span className="shrink-0">Intensity</span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={environmentIntensity}
                  onChange={(e) =>
                    setEnvironmentIntensity(Number(e.target.value))
                  }
                  className="min-w-0 flex-1 accent-[#0abab5]"
                />
                <span className="w-10 shrink-0 text-right font-mono text-white/70">
                  {environmentIntensity.toFixed(2)}
                </span>
              </label>

              <input
                ref={hdrInputRef}
                type="file"
                accept=".hdr"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0], "lighting")}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => propInputRef.current?.click()}
                  disabled={busy === "props"}
                  className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50"
                >
                  <Upload className="size-3.5" />
                  {busy === "props" ? "Uploading…" : "Upload prop"}
                </button>
                <span className="text-xs text-white/40">
                  Then drag a model onto the scene to place it.
                </span>
              </div>

              {library.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {library.map((item) => (
                    <LibraryCard
                      key={item.id}
                      item={item}
                      onDelete={removeLibraryItem}
                    />
                  ))}
                </div>
              )}

              {library.length === 0 && (
                <p className="text-xs text-white/35">
                  No props yet. Upload a model to start building the scene.
                </p>
              )}

              <div className="border-t border-white/10 pt-2">
                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-white/40">
                  Placed props ({props.length})
                </p>
                {props.length === 0 ? (
                  <p className="text-xs text-white/35">
                    Nothing placed yet — drag a library model onto the scene.
                  </p>
                ) : (
                  <div className="flex flex-col">
                    {props.map((p) => (
                      <PlacedPropRow
                        key={p.id}
                        name={p.name}
                        selected={p.id === selectedId}
                        onSelect={() => selectProp(p.id)}
                        onDelete={() => removeProp(p.id)}
                      />
                    ))}
                  </div>
                )}
              </div>

              <input
                ref={propInputRef}
                type="file"
                accept=".glb,.gltf"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0], "props")}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
