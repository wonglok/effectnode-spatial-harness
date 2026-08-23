"use client";

import { useRef, useState } from "react";
import { FileText, LayoutGrid, List, Trash2, Upload, Wand2 } from "lucide-react";
import { useAssetManagerStore, type AssetFile } from "@/stores/asset-manager";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function thumbFor(f: AssetFile): string | null {
  if (f.thumbnailUrl) return f.thumbnailUrl;
  if (f.contentType.startsWith("image/")) return f.url;
  return null;
}

/** S3-backed file manager for a single world's assets. */
export function FileManager({ worldId }: { worldId: string }) {
  const files = useAssetManagerStore((s) => s.files);
  const loading = useAssetManagerStore((s) => s.filesLoading);
  const error = useAssetManagerStore((s) => s.filesError);
  const uploads = useAssetManagerStore((s) => s.uploads);
  const overallProgress = useAssetManagerStore((s) => s.overallProgress);
  const uploadFiles = useAssetManagerStore((s) => s.uploadFiles);
  const deleteFile = useAssetManagerStore((s) => s.deleteFile);
  const deleteAllFiles = useAssetManagerStore((s) => s.deleteAllFiles);
  const generateThumbnails = useAssetManagerStore((s) => s.generateThumbnails);
  const inputRef = useRef<HTMLInputElement>(null);

  const [view, setView] = useState<"list" | "grid">("grid");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [generating, setGenerating] = useState(false);

  const busy = loading || uploads.length > 0;
  const missingThumbs = files.filter(
    (f) => !f.thumbnailUrl && /\.(glb|gltf)$/i.test(f.name),
  ).length;

  async function onPick(file: File | undefined) {
    if (!file) return;
    await uploadFiles(worldId, [file]);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleDeleteAll() {
    if (confirmText.trim().toLowerCase() !== "delete") return;
    setDeleting(true);
    await deleteAllFiles(worldId);
    setDeleting(false);
    setConfirmOpen(false);
    setConfirmText("");
  }

  async function handleGenerateThumbs() {
    setGenerating(true);
    await generateThumbnails(worldId);
    setGenerating(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-white/10 px-3">
        <h2 className="text-sm font-semibold">Files</h2>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5 rounded-md border border-white/10 bg-white/5 p-0.5">
            <button
              onClick={() => setView("list")}
              title="List view"
              aria-label="List view"
              className={cn(
                "rounded p-1 transition-colors",
                view === "list"
                  ? "bg-white/15 text-white"
                  : "text-white/40 hover:text-white",
              )}
            >
              <List className="size-3.5" />
            </button>
            <button
              onClick={() => setView("grid")}
              title="Grid view"
              aria-label="Grid view"
              className={cn(
                "rounded p-1 transition-colors",
                view === "grid"
                  ? "bg-white/15 text-white"
                  : "text-white/40 hover:text-white",
              )}
            >
              <LayoutGrid className="size-3.5" />
            </button>
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50"
          >
            <Upload className="size-3.5" />
            {busy ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0])}
      />

      {/* Upload progress */}
      {uploads.length > 0 && (
        <div className="space-y-2 border-b border-white/10 p-2">
          <div>
            <div className="mb-1 flex items-center justify-between text-[10px] text-white/50">
              <span>
                Uploading {uploads.length} file{uploads.length > 1 ? "s" : ""}
              </span>
              <span>{Math.round(overallProgress)}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-[#0abab5] transition-all duration-150"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
          </div>

          {uploads.map((u) => (
            <div key={u.id}>
              <div className="mb-1 flex items-center justify-between gap-2 text-[10px] text-white/50">
                <span className="min-w-0 flex-1 truncate">{u.name}</span>
                <span className={u.status === "error" ? "text-red-400" : ""}>
                  {u.status === "error" ? "failed" : `${Math.round(u.progress)}%`}
                </span>
              </div>
              <div className="h-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-150",
                    u.status === "error" ? "bg-red-400" : "bg-[#0abab5]",
                  )}
                  style={{ width: `${u.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {error && <p className="px-1 py-1 text-xs text-red-400">{error}</p>}

        {files.length === 0 && !loading && (
          <p className="px-1 py-3 text-xs text-white/40">
            No files yet. Upload or drop an asset to get started.
          </p>
        )}

        {view === "list" ? (
          <div className="flex flex-col">
            {files.map((f) => (
              <div
                key={f.id}
                className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-white/5"
              >
                {thumbFor(f) ? (
                  <img
                    src={thumbFor(f)!}
                    alt=""
                    className="size-8 shrink-0 rounded-md border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5">
                    <FileText className="size-4 text-white/40" />
                  </div>
                )}
                <a
                  href={f.url}
                  target="_blank"
                  rel="noreferrer"
                  title={f.name}
                  className="min-w-0 flex-1 truncate text-white/80 hover:text-white hover:underline"
                >
                  {f.name}
                </a>
                <span className="shrink-0 font-mono text-[10px] text-white/30">
                  {formatBytes(f.size)}
                </span>
                <button
                  onClick={() => deleteFile(worldId, f.id)}
                  title="Delete file"
                  aria-label="Delete file"
                  className="shrink-0 rounded p-1 text-white/30 opacity-0 transition-colors hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {files.map((f) => (
              <div
                key={f.id}
                className="group relative flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-2 transition-colors hover:border-white/20 hover:bg-white/[0.06]"
              >
                <button
                  onClick={() => deleteFile(worldId, f.id)}
                  title="Delete file"
                  aria-label="Delete file"
                  className="absolute right-1.5 top-1.5 z-10 hidden size-6 items-center justify-center rounded-full bg-neutral-900/90 text-white/50 ring-1 ring-white/10 transition-colors hover:bg-red-500/20 hover:text-red-400 group-hover:flex"
                >
                  <Trash2 className="size-3" />
                </button>
                {thumbFor(f) ? (
                  <img
                    src={thumbFor(f)!}
                    alt={f.name}
                    className="aspect-square w-full rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-white/10 bg-white/5">
                    <FileText className="size-8 text-white/40" />
                  </div>
                )}
                <span
                  className="w-full truncate text-center text-[11px] text-white/70"
                  title={f.name}
                >
                  {f.name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="shrink-0 space-y-2 border-t border-white/10 p-2">
          {missingThumbs > 0 && (
            <button
              onClick={handleGenerateThumbs}
              disabled={generating}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50"
            >
              <Wand2 className="size-3.5" />
              {generating
                ? "Generating…"
                : `Generate ${missingThumbs} thumbnail${missingThumbs > 1 ? "s" : ""}`}
            </button>
          )}
          <button
            onClick={() => setConfirmOpen(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-red-500/20 px-2 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
          >
            <Trash2 className="size-3.5" /> Delete all files
          </button>
        </div>
      )}

      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setConfirmOpen(false);
              setConfirmText("");
            }}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/10 bg-neutral-900 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.6)]">
            <h3 className="text-base font-semibold text-white">
              Delete all files?
            </h3>
            <p className="mt-2 text-sm text-white/50">
              This permanently deletes all {files.length} file
              {files.length > 1 ? "s" : ""} in this world. Type{" "}
              <code className="rounded bg-white/10 px-1 text-white/80">
                delete
              </code>{" "}
              to confirm.
            </p>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="delete"
              autoFocus
              className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-white/25"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setConfirmOpen(false);
                  setConfirmText("");
                }}
                className="rounded-md border border-white/15 bg-white/10 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-white/15"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                disabled={
                  confirmText.trim().toLowerCase() !== "delete" || deleting
                }
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-red-500 disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete everything"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
