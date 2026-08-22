import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuthStore } from "@/stores/auth";
import { Button } from "@/components/ui/button";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

const inputClass = cn(
  "w-full rounded-2xl px-4 py-3 text-sm",
  "bg-white/80 border border-primary/20",
  "text-foreground placeholder:text-muted-foreground/70",
  "outline-none backdrop-blur-sm",
  "focus:border-primary/60 focus:ring-4 focus:ring-primary/15",
  "transition",
);

export function RegisterPage() {
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await register({ username, email, password });
      navigate("/account", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <HeroBackdrop />
      <main className="relative z-10 mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-16">
        <div className="rounded-3xl border border-primary/15 bg-white/75 p-7 shadow-xl shadow-primary/10 backdrop-blur-xl sm:p-9">
          <h1 className="text-3xl font-semibold tracking-tight">
            Create your account
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Register with a username, email, and password.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3">
            <input
              autoFocus
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              aria-label="Username"
              autoComplete="username"
              className={inputClass}
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              aria-label="Email"
              autoComplete="email"
              className={inputClass}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password (min 8 characters)"
              aria-label="Password"
              autoComplete="new-password"
              className={inputClass}
            />
            <Button type="submit" disabled={busy || !username.trim() || !email.trim() || !password}>
              Create account
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-[#078b87] hover:underline">
                Sign in
              </Link>
            </p>
          </form>

          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
        </div>
      </main>
    </div>
  );
}
