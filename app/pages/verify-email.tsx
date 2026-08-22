import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { api, errorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { HeroBackdrop } from "@/components/hero-backdrop";

type Status = "loading" | "success" | "error";

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
    api<{ verified: boolean }>(
      `/api/auth/verify-email/confirm?token=${encodeURIComponent(token)}`,
    )
      .then(() => {
        setStatus("success");
        useAuthStore.getState().refresh();
      })
      .catch((err) => {
        setStatus("error");
        setMessage(errorMessage(err));
      });
  }, [token]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <HeroBackdrop />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
        <div className="rounded-3xl border border-primary/15 bg-white/75 p-9 text-center shadow-xl shadow-primary/10 backdrop-blur-xl">
          {status === "loading" && (
            <p className="text-muted-foreground">Verifying your email…</p>
          )}

          {status === "success" && (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">
                Email verified
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your email address is now confirmed.
              </p>
              <Link
                to="/account"
                className="mt-4 inline-block text-sm font-medium text-[#078b87] hover:underline"
              >
                Go to your account
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">
                Verification failed
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">{message}</p>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
