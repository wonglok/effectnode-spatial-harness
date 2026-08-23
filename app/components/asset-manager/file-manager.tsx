"use client";

import { useRef } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
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
  const inputRef = useRef<HTMLInputElement>(null);

  const busy = loading || uploads.length > 0;

  async function onPick(file: File | undefined) {
    if (!file) return;
    await uploadFiles(worldId, [file]);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 px-3">
        <h2 className="text-sm font-semibold">Files</h2>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/10 px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-white/15 disabled:opacity-50"
        >
          <Upload className="size-3.5" />
          {busy ? "Uploading…" : "Upload"}
        </button>
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
    </div>
  );
}
