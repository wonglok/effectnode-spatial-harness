import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { cn } from "@/lib/utils";
import type { World } from "../../shared/types/world";
import { ArrowLeft, Save, Trash2 } from "lucide-react";

const inputClass = cn(
  "w-full rounded-2xl px-4 py-3 text-sm",
  "bg-white/80 border border-primary/20",
  "text-foreground placeholder:text-muted-foreground/70",
  "outline-none backdrop-blur-sm",
  "focus:border-primary/60 focus:ring-4 focus:ring-primary/15",
  "transition",
);

const labelClass = "mb-1.5 block text-sm font-medium text-foreground";

interface FormState {
  name: string;
  description: string;
  coverUrl: string;
  sceneURL: string;
  featured: boolean;
  published: boolean;
}

export function WorldEditPage() {
  const { worldID } = useParams<{ worldID: string }>();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>({
    name: "",
    description: "",
    coverUrl: "",
    sceneURL: "",
    featured: false,
    published: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!worldID) return;
    api<{ world: World }>(`/api/admin/worlds/${worldID}`)
      .then((r) => {
        setForm({
          name: r.world.name,
          description: r.world.description,
          coverUrl: r.world.coverUrl ?? "",
          sceneURL: r.world.sceneURL ?? "",
          featured: r.world.featured,
          published: r.world.published,
        });
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [worldID]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await api(`/api/admin/worlds/${worldID}`, {
        method: "PATCH",
        body: form,
      });
      navigate("/admin/world-manager");
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
      await api(`/api/admin/worlds/${worldID}`, { method: "DELETE" });
      navigate("/admin/world-manager");
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-background">
        <HeroBackdrop />
        <main className="relative z-10 mx-auto max-w-2xl px-5 py-16">
          <p className="text-muted-foreground">Loading…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <HeroBackdrop />
      <main className="relative z-10 mx-auto max-w-2xl px-5 py-16">
        <div className="flex items-center justify-between">
          <Link
            to="/admin/world-manager"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" /> World manager
          </Link>
        </div>

        <div className="mt-4 rounded-3xl border border-primary/15 bg-white/75 p-7 shadow-xl shadow-primary/10 backdrop-blur-xl sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">Edit world</h1>

          {notice && <p className="mt-3 text-sm text-[#078b87]">{notice}</p>}
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          <div className="mt-6 flex flex-col gap-4">
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
              <label className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => set("featured", e.target.checked)}
                  className="size-4 accent-[#0abab5]"
                />
                Featured
              </label>
              <label className="flex items-center gap-2.5 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={form.published}
                  onChange={(e) => set("published", e.target.checked)}
                  className="size-4 accent-[#0abab5]"
                />
                Published
              </label>
            </div>
          </div>

          <div className="mt-7 flex items-center gap-2 border-t border-primary/10 pt-5">
            <Button onClick={save} disabled={busy || !form.name.trim()} className="gap-2">
              <Save className="size-4" /> {busy ? "Saving…" : "Save changes"}
            </Button>
            <button
              onClick={del}
              disabled={busy}
              className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
            >
              <Trash2 className="size-4" /> Delete
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
