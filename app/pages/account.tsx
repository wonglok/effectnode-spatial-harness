import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useAuthStore } from "@/stores/auth";
import { api, errorMessage } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { cn } from "@/lib/utils";
import { Check, Fingerprint, LogOut, Mail, Upload } from "lucide-react";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function AccountPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const refresh = useAuthStore((s) => s.refresh);
  const registerPasskey = useAuthStore((s) => s.registerPasskey);
  const logout = useAuthStore((s) => s.logout);

  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) return null;

  const initials = (user.username[0] ?? "?").toUpperCase();

  async function onVerifyEmail() {
    setBusy("verify");
    setError(null);
    setNotice(null);
    try {
      const res = await api<{ sent: boolean; alreadyVerified?: boolean }>(
        "/api/auth/verify-email/send",
        { method: "POST", body: {} },
      );
      setNotice(
        res.alreadyVerified
          ? "Email is already verified."
          : "Verification email sent — check your inbox.",
      );
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function onRegisterPasskey() {
    setBusy("passkey");
    setError(null);
    setNotice(null);
    try {
      await registerPasskey();
      setNotice("Passkey registered — you can now sign in with it.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(null);
    setNotice(null);

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Image too large (max 5 MB).");
      return;
    }

    setBusy("avatar");
    try {
      const { uploadUrl, publicUrl } = await api<{
        uploadUrl: string;
        publicUrl: string;
      }>("/api/auth/avatar/presign", {
        method: "POST",
        body: { contentType: file.type },
      });

      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      await api("/api/auth/me", {
        method: "PATCH",
        body: { avatarUrl: publicUrl },
      });
      await refresh();
      setNotice("Avatar updated.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  async function onLogout() {
    await logout();
    navigate("/");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <HeroBackdrop />
      <main className="relative z-10 mx-auto max-w-lg px-5 py-16">
        <div className="rounded-3xl border border-primary/15 bg-white/75 p-7 shadow-xl shadow-primary/10 backdrop-blur-xl sm:p-8">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Avatar className="size-14 ring-2 ring-primary/20">
              <AvatarImage src={user.avatarUrl ?? undefined} alt={user.username} />
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight">
                {user.username}
              </h1>
              <p className="truncate text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Badge
              variant={user.role === "admin" ? "default" : "outline"}
              className="ml-auto"
            >
              {user.role}
            </Badge>
          </div>

          {/* Avatar upload */}
          <div className="mt-7">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onAvatarChange}
            />
            <Button
              variant="outline"
              className="w-full"
              disabled={busy !== null}
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="size-4" />
              {busy === "avatar" ? "Uploading…" : "Upload avatar"}
            </Button>
          </div>

          {/* Email verification */}
          <div className="mt-4 rounded-2xl border border-primary/15 bg-white/60 p-5">
            <div className="flex items-center gap-2">
              <Mail className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                Email verification
              </span>
              {user.emailVerified && (
                <Badge variant="default" className="ml-auto">
                  <Check className="size-3" /> Verified
                </Badge>
              )}
            </div>
            {!user.emailVerified && (
              <Button
                variant="secondary"
                size="sm"
                className="mt-3"
                disabled={busy !== null}
                onClick={onVerifyEmail}
              >
                {busy === "verify" ? "Sending…" : "Resend verification email"}
              </Button>
            )}
          </div>

          {/* Passkey */}
          <div className="mt-4 rounded-2xl border border-primary/15 bg-white/60 p-5">
            <div className="flex items-center gap-2">
              <Fingerprint className="size-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Passkey</span>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3"
              disabled={busy !== null}
              onClick={onRegisterPasskey}
            >
              {busy === "passkey" ? "Waiting for device…" : "Register a passkey"}
            </Button>
          </div>

          {notice && <p className="mt-4 text-sm text-[#078b87]">{notice}</p>}
          {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

          {/* Footer actions */}
          <div className="mt-7 flex items-center justify-between">
            {user.role === "admin" && (
              <Link to="/admin" className="text-sm font-medium text-[#078b87] hover:underline">
                Admin panel
              </Link>
            )}
            <Button
              variant="ghost"
              className={cn("ml-auto text-muted-foreground hover:text-foreground")}
              onClick={onLogout}
            >
              <LogOut className="size-4" /> Log out
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
