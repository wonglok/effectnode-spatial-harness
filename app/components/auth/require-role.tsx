import { useEffect } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuthStore } from "@/stores/auth";
import { Badge } from "@/components/ui/badge";
import type { UserRole } from "../../../shared/types/auth";

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center text-muted-foreground">
      Loading…
    </div>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const location = useLocation();

  useEffect(() => {
    if (status === "loading") useAuthStore.getState().init();
  }, [status]);

  if (status === "loading") return <Loading />;
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ next: location.pathname }} />;
  }
  return <>{children}</>;
}

export function RequireRole({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  useEffect(() => {
    if (status === "loading") useAuthStore.getState().init();
  }, [status]);

  if (status === "loading") return <Loading />;
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ next: location.pathname }} />;
  }

  if (user?.role !== role) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center">
        <Badge variant="destructive">Access denied</Badge>
        <p className="max-w-sm text-sm text-muted-foreground">
          You need the <span className="font-semibold text-foreground">{role}</span>{" "}
          role to view this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
