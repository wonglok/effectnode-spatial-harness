import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuthStore, type ResolvedLogin } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { ArrowLeft, Fingerprint, Lock } from "lucide-react";

type Step = 1 | 2;

const inputClass = cn(
  "w-full rounded-2xl px-4 py-3 text-sm",
  "bg-white/80 border border-primary/20",
  "text-foreground placeholder:text-muted-foreground/70",
  "outline-none backdrop-blur-sm",
  "focus:border-primary/60 focus:ring-4 focus:ring-primary/15",
  "transition",
);

function MethodCard({
  title,
  subtitle,
  icon,
  highlighted,
  children,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  highlighted: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border p-5 transition-colors",
        highlighted
          ? "border-primary/40 bg-primary/10 ring-1 ring-primary/20"
          : "border-primary/15 bg-white/60",
      )}
    >
      {highlighted && (
        <span className="absolute -top-3 right-4 z-10">
          <Badge className="px-2.5 py-0.5 text-[10px] font-semibold shadow-md">
            last used login method
          </Badge>
        </span>
      )}
      <div className="mb-2 flex items-center gap-2.5">
        <span
          className={cn("size-5", highlighted ? "text-primary" : "text-muted-foreground")}
        >
          {icon}
        </span>
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">{subtitle}</p>
      {children}
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.45c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3c-1.08.72-2.45 1.15-4.06 1.15-3.13 0-5.78-2.11-6.72-4.95H1.28v3.09C3.26 21.3 7.31 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.29c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.28C.47 8.24 0 10.05 0 12s.47 3.76 1.28 5.38l4-3.09z"
      />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.34.6 4.59 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.28 6.62l4 3.09C6.22 6.88 8.87 4.77 12 4.77z"
      />
    </svg>
  );
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const resolveIdentifier = useAuthStore((s) => s.resolveIdentifier);
  const loginPassword = useAuthStore((s) => s.loginPassword);
  const loginPasskey = useAuthStore((s) => s.loginPasskey);

  const [step, setStep] = useState<Step>(1);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [resolved, setResolved] = useState<ResolvedLogin | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const nextPath =
    (location.state as { next?: string } | null)?.next ?? "/account";

  function handleGoogle() {
    window.location.href = `/api/auth/google/start?next=${encodeURIComponent(
      nextPath,
    )}`;
  }

  async function handleResolve(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!identifier.trim()) return;
    setError(null);
    setBusy(true);
    try {
      setResolved(await resolveIdentifier(identifier));
      setStep(2);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handlePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await loginPassword(identifier, password);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handlePasskey() {
    setError(null);
    setBusy(true);
    try {
      await loginPasskey(identifier);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const lastUsed = resolved?.effectiveLastUsed ?? null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <HeroBackdrop />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
        <div className="rounded-3xl border border-primary/15 bg-white/75 p-7 shadow-xl shadow-primary/10 backdrop-blur-xl sm:p-9">
          <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Welcome back to 3D & AI Harness.
          </p>

          {step === 1 && (
            <form onSubmit={handleResolve} className="mt-7 flex flex-col gap-3">
              <input
                autoFocus
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Username or email"
                aria-label="Username or email"
                className={inputClass}
              />
              <Button type="submit" disabled={busy || !identifier.trim()}>
                Continue
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                No account?{" "}
                <Link to="/register" className="font-medium text-[#078b87] hover:underline">
                  Create one
                </Link>
              </p>
            </form>
          )}

          {step === 2 && resolved && (
            <div className="mt-7 flex flex-col gap-3">
              {!resolved.found && (
                <div className="rounded-2xl border border-primary/15 bg-white/60 p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No account found for{" "}
                    <span className="font-semibold text-foreground">{identifier}</span>.
                  </p>
                  <Link
                    to="/register"
                    className="mt-1 inline-block text-sm font-medium text-[#078b87] hover:underline"
                  >
                    Create an account
                  </Link>
                </div>
              )}

              {resolved.found && resolved.methods.password && (
                <MethodCard
                  title="Password"
                  subtitle="Enter your password to continue."
                  icon={<Lock />}
                  highlighted={lastUsed === "password"}
                >
                  <form onSubmit={handlePassword} className="flex flex-col gap-2.5">
                    <input
                      type="password"
                      autoFocus
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      aria-label="Password"
                      className={inputClass}
                    />
                    <Button type="submit" disabled={busy || !password}>
                      Sign in
                    </Button>
                  </form>
                </MethodCard>
              )}

              {resolved.found && resolved.methods.passkey && (
                <MethodCard
                  title="Passkey"
                  subtitle="Sign in with your device or password manager."
                  icon={<Fingerprint />}
                  highlighted={lastUsed === "passkey"}
                >
                  <Button
                    variant="outline"
                    onClick={handlePasskey}
                    disabled={busy}
                    className="w-full"
                  >
                    Use passkey
                  </Button>
                </MethodCard>
              )}

              <button
                onClick={() => {
                  setStep(1);
                  setPassword("");
                  setError(null);
                }}
                className="inline-flex items-center gap-1.5 self-start text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" /> Back
              </button>
            </div>
          )}

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          <div className="mt-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-foreground/10" />
            <span className="text-xs text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-foreground/10" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-primary/20 bg-white px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-white/90"
          >
            <GoogleLogo /> Continue with Google
          </button>
        </div>
      </main>
    </div>
  );
}
