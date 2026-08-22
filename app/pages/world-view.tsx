import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { HeroBackdrop } from "@/components/hero-backdrop";
import type { World } from "../../shared/types/world";
import { ArrowLeft, Play } from "lucide-react";

export function WorldViewPage() {
  const { worldID } = useParams<{ worldID: string }>();
  const navigate = useNavigate();
  const [world, setWorld] = useState<World | null>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading",
  );

  useEffect(() => {
    if (!worldID) {
      setStatus("error");
      return;
    }
    setStatus("loading");
    api<{ world: World }>(`/api/worlds/${worldID}`)
      .then((r) => {
        setWorld(r.world);
        setStatus("loaded");
      })
      .catch(() => setStatus("error"));
  }, [worldID]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <HeroBackdrop />
      <main className="relative z-10 mx-auto max-w-3xl px-5 py-16">
        {status === "loading" && (
          <p className="text-center text-muted-foreground">Loading…</p>
        )}

        {status === "error" && (
          <div className="rounded-3xl border border-primary/15 bg-white/75 p-10 text-center shadow-xl shadow-primary/10 backdrop-blur-xl">
            <h1 className="text-2xl font-semibold tracking-tight">
              World not found
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This world doesn&apos;t exist or isn&apos;t published yet.
            </p>
            <Link
              to="/"
              className="mt-4 inline-block text-sm font-medium text-[#078b87] hover:underline"
            >
              Back home
            </Link>
          </div>
        )}

        {status === "loaded" && world && (
          <div className="flex flex-col gap-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Back
            </Link>

            {world.coverUrl ? (
              <img
                src={world.coverUrl}
                alt={world.name}
                className="h-64 w-full rounded-3xl object-cover shadow-xl shadow-primary/10 sm:h-80"
              />
            ) : (
              <div
                className="flex h-64 w-full items-center justify-center rounded-3xl text-6xl font-bold text-white shadow-xl shadow-primary/20 sm:h-80"
                style={{
                  backgroundImage:
                    "linear-gradient(120deg, #0abab5 0%, #3bb6d8 60%, #9b8af0 100%)",
                }}
              >
                {world.name[0]?.toUpperCase() ?? "W"}
              </div>
            )}

            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                {world.name}
              </h1>
              {world.description && (
                <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted-foreground">
                  {world.description}
                </p>
              )}
            </div>

            <Button
              size="lg"
              className="w-fit gap-2"
              onClick={() => navigate(`/world/${world.id}/view`)}
            >
              <Play className="size-4" /> Enter world
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
