import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { api, errorMessage } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { cn } from "@/lib/utils";
import type { World } from "../../shared/types/world";
import { ArrowLeft, Eye, Pencil, Plus, Trash2 } from "lucide-react";

const inputClass = cn(
  "w-full rounded-2xl px-4 py-3 text-sm",
  "bg-white/80 border border-primary/20",
  "text-foreground placeholder:text-muted-foreground/70",
  "outline-none backdrop-blur-sm",
  "focus:border-primary/60 focus:ring-4 focus:ring-primary/15",
  "transition",
);

function Cover({ world }: { world: World }) {
  if (world.coverUrl) {
    return (
      <img
        src={world.coverUrl}
        alt=""
        className="h-36 w-full rounded-2xl object-cover"
      />
    );
  }
  return (
    <div
      className="flex h-36 w-full items-center justify-center rounded-2xl text-3xl font-bold text-white"
      style={{
        backgroundImage:
          "linear-gradient(120deg, #0abab5 0%, #3bb6d8 60%, #9b8af0 100%)",
      }}
    >
      {world.name[0]?.toUpperCase() ?? "W"}
    </div>
  );
}

export function WorldManagerPage() {
  const navigate = useNavigate();

  const [worlds, setWorlds] = useState<World[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  async function load() {
    try {
      const res = await api<{ worlds: World[] }>("/api/admin/worlds");
      setWorlds(res.worlds);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      const { world } = await api<{ world: World }>("/api/admin/worlds", {
        method: "POST",
        body: { name, description },
      });
      setName("");
      setDescription("");
      setShowCreate(false);
      setNotice("World created.");
      await load();
      navigate(`/world/${world.id}/edit`);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function removeWorld(id: string) {
    if (!window.confirm("Delete this world? This cannot be undone.")) return;
    setError(null);
    setNotice(null);
    try {
      await api(`/api/admin/worlds/${id}`, { method: "DELETE" });
      setNotice("World deleted.");
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <HeroBackdrop />
      <main className="relative z-10 mx-auto max-w-5xl px-5 py-16">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Admin panel
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              World manager
            </h1>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowCreate((v) => !v)}
            className="gap-1.5"
          >
            <Plus className="size-4" /> New world
          </Button>
        </div>

        {notice && <p className="mt-4 text-sm text-[#078b87]">{notice}</p>}
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        {/* Create form */}
        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="mt-6 rounded-3xl border border-primary/15 bg-white/70 p-6 backdrop-blur-xl shadow-sm"
          >
            <h2 className="text-lg font-semibold">Create a world</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="World name"
                aria-label="World name"
                className={inputClass}
              />
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description"
                aria-label="Description"
                className={inputClass}
              />
            </div>
            <Button
              type="submit"
              disabled={busy || !name.trim()}
              className="mt-4"
            >
              {busy ? "Creating…" : "Create world"}
            </Button>
          </form>
        )}

        {/* World cards */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {worlds.map((world) => (
            <div
              key={world.id}
              className="flex flex-col gap-4 rounded-3xl border border-primary/15 bg-white/70 p-4 backdrop-blur-xl shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/15"
            >
              <Cover world={world} />

              <div className="flex flex-1 flex-col gap-1 px-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate text-lg font-semibold">
                    {world.name}
                  </h2>
                  {world.featured && <Badge variant="default">Featured</Badge>}
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {world.description || "No description yet."}
                </p>
                <div className="mt-1">
                  <Badge variant={world.published ? "outline" : "subtle"}>
                    {world.published ? "Published" : "Draft"}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-2 border-t border-primary/10 px-1 pt-3">
                <Button
                  variant="secondary"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => navigate(`/world/${world.id}/edit`)}
                >
                  <Pencil className="size-3.5" /> Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() =>
                    navigate(`/world/${world.id}/view?from=admin-world-manager`)
                  }
                >
                  <Eye className="size-3.5" /> View
                </Button>
                <button
                  onClick={() => removeWorld(world.id)}
                  title="Delete world"
                  className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                >
                  <Trash2 className="size-3.5" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {worlds.length === 0 && (
          <div className="mt-8 rounded-3xl border border-primary/15 bg-white/70 p-10 text-center backdrop-blur-xl">
            <p className="text-sm text-muted-foreground">
              No worlds yet. Create your first world to get started.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
