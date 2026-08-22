import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/api";
import { Save, Trash2 } from "lucide-react";
import type { World } from "../../../shared/types/world";

export interface WorldSettingsInput {
  name: string;
  description: string;
  coverUrl: string;
  sceneURL: string;
  featured: boolean;
  published: boolean;
}

const inputClass = cn(
  "w-full rounded-xl px-3.5 py-2.5 text-sm",
  "bg-white/[0.06] border border-white/[0.1]",
  "text-white placeholder:text-white/25",
  "outline-none",
  "focus:border-white/25 focus:ring-1 focus:ring-white/10",
  "transition",
);

const labelClass = "mb-1.5 block text-xs font-medium text-white/60";

/** Metadata editor for a world — used inside the settings popup. */
export function WorldSettingsForm({
  world,
  onSave,
  onDelete,
}: {
  world: World;
  onSave: (values: WorldSettingsInput) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [form, setForm] = useState<WorldSettingsInput>({
    name: world.name,
    description: world.description ?? "",
    coverUrl: world.coverUrl ?? "",
    sceneURL: world.sceneURL ?? "",
    featured: world.featured,
    published: world.published,
  });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function set<K extends keyof WorldSettingsInput>(
    key: K,
    value: WorldSettingsInput[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await onSave(form);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  async function del() {
    if (!window.confirm("Delete this world? This cannot be undone.")) return;
    setError(null);
    setBusy(true);
    try {
      await onDelete();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {notice && <p className="text-sm text-[#0abab5]">{notice}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div>
        <label className={labelClass} htmlFor="name">
          Name
        </label>
        <input
          id="name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="description">
          Description
        </label>
        <textarea
          id="description"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          className={cn(inputClass, "resize-none")}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="coverUrl">
          Cover image URL
        </label>
        <input
          id="coverUrl"
          value={form.coverUrl}
          onChange={(e) => set("coverUrl", e.target.value)}
          placeholder="https://…"
          className={inputClass}
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="sceneURL">
          Scene URL
        </label>
        <input
          id="sceneURL"
          value={form.sceneURL}
          onChange={(e) => set("sceneURL", e.target.value)}
          placeholder="https://… (optional .glb scene)"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
        <label className="flex items-center gap-2.5 text-sm font-medium text-white/90">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => set("featured", e.target.checked)}
            className="size-4 accent-[#0abab5]"
          />
          Featured
        </label>
        <label className="flex items-center gap-2.5 text-sm font-medium text-white/90">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => set("published", e.target.checked)}
            className="size-4 accent-[#0abab5]"
          />
          Published
        </label>
      </div>

      <div className="flex items-center gap-2 border-t border-white/10 pt-4">
        <Button onClick={save} disabled={busy || !form.name.trim()} className="gap-2">
          <Save className="size-4" /> {busy ? "Saving…" : "Save changes"}
        </Button>
        <button
          onClick={del}
          disabled={busy}
          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-white/50 transition-colors hover:bg-red-500/10 hover:text-red-400"
        >
          <Trash2 className="size-4" /> Delete
        </button>
      </div>
    </div>
  );
}
