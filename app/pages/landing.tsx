import { Link, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { World } from "../../shared/types/world";

function WorldCover({ world }: { world: World }) {
  if (world.coverUrl) {
    return (
      <img
        src={world.coverUrl}
        alt=""
        className="h-40 w-full rounded-2xl object-cover"
      />
    );
  }
  return (
    <div
      className="flex h-40 w-full items-center justify-center rounded-2xl text-4xl font-bold text-white"
      style={{
        backgroundImage:
          "linear-gradient(120deg, #0abab5 0%, #3bb6d8 60%, #9b8af0 100%)",
      }}
    >
      {world.name[0]?.toUpperCase() ?? "W"}
    </div>
  );
}

export function LandingPage() {
  const navigate = useNavigate();
  const [worlds, setWorlds] = useState<World[]>([]);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    api<{ worlds: World[] }>("/api/worlds?featured=true")
      .then((r) => setWorlds(r.worlds))
      .catch(() => setWorlds([]));
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <HeroBackdrop />

      <header className="absolute top-5 right-5 z-30">
        {user ? (
          <Link
            to="/account"
            className="rounded-full border border-primary/25 bg-white/70 px-4 py-2 text-sm font-medium text-foreground backdrop-blur-md transition hover:bg-white"
          >
            {user.username}
          </Link>
        ) : (
          <Link
            to="/login"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition hover:brightness-95"
          >
            Sign in
          </Link>
        )}
      </header>

      <main className="relative z-10 mx-auto max-w-4xl px-5 sm:px-6 pb-20 sm:pb-28">
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="flex flex-col items-center gap-6 pt-32 text-center sm:pt-40">
          <span className="rounded-full border border-primary/25 bg-white/60 px-4 py-1.5 text-xs font-medium tracking-wide text-[#078b87] backdrop-blur-sm">
            A multiplayer 3D world
          </span>
          <h1
            className="bg-clip-text text-6xl font-bold tracking-tight text-transparent sm:text-7xl lg:text-8xl"
            style={{
              backgroundImage:
                "linear-gradient(100deg, #0abab5 0%, #3bb6d8 55%, #9b8af0 100%)",
            }}
          >
            3D & AI Harness
          </h1>
          <p className="max-w-lg text-balance text-lg leading-relaxed text-muted-foreground">
            Enter a multiplayer 3D world. Explore places, chat with others, and
            build together.
          </p>
        </section>

        {/* ── Featured Worlds ────────────────────────────────── */}
        {worlds.length > 0 && (
          <section className="mt-10">
            <h2 className="mb-4 text-xs font-semibold uppercase tracking-[0.2em] text-[#078b87]">
              Featured Worlds
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {worlds.map((world) => (
                <button
                  key={world.id}
                  onClick={() => navigate(`/world/${world.id}/view`)}
                  className={cn(
                    "group flex flex-col gap-3 rounded-3xl p-4 text-left",
                    "border border-primary/15 bg-white/70 backdrop-blur-xl shadow-sm",
                    "transition-all duration-300 ease-out",
                    "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/15",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                  )}
                >
                  <WorldCover world={world} />
                  <div className="flex flex-col gap-1 px-1">
                    <h3 className="text-base font-semibold text-foreground">
                      {world.name}
                    </h3>
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {world.description || "Explore this world."}
                    </p>
                  </div>
                  <span className="px-1 text-xs font-medium text-transparent transition-all duration-300 translate-x-0 group-hover:translate-x-0.5 group-hover:text-[#078b87]">
                    View world &rarr;
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}

      </main>
    </div>
  );
}
