import { Link } from "react-router";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { Globe, Users } from "lucide-react";

export function AdminPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <HeroBackdrop />
      <main className="relative z-10 mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Admin panel</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Manage users, worlds, and their access rights.
        </p>

        <div className="mt-7 grid gap-4 sm:grid-cols-2">
          <Link
            to="/admin/user-management"
            className="group rounded-3xl border border-primary/15 bg-white/70 p-6 backdrop-blur-xl shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/15"
          >
            <Users className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
            <h2 className="mt-4 text-lg font-semibold">User management</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create, edit, and remove users. Change roles and access rights.
            </p>
          </Link>

          <Link
            to="/admin/world-manager"
            className="group rounded-3xl border border-primary/15 bg-white/70 p-6 backdrop-blur-xl shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/15"
          >
            <Globe className="size-5 text-muted-foreground transition-colors group-hover:text-primary" />
            <h2 className="mt-4 text-lg font-semibold">World manager</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create, edit, and publish worlds. Each world has its own public
              page and playable space.
            </p>
          </Link>
        </div>
      </main>
    </div>
  );
}
