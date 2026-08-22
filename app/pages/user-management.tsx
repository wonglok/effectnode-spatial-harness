import { useEffect, useState } from "react";
import { Link } from "react-router";
import { api, errorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { cn } from "@/lib/utils";
import type { AuthUser, UserRole } from "../../shared/types/auth";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

const ROLES: UserRole[] = ["admin", "editor", "public"];

const inputClass = cn(
  "w-full rounded-2xl px-4 py-3 text-sm",
  "bg-white/80 border border-primary/20",
  "text-foreground placeholder:text-muted-foreground/70",
  "outline-none backdrop-blur-sm",
  "focus:border-primary/60 focus:ring-4 focus:ring-primary/15",
  "transition",
);

export function UserManagementPage() {
  const me = useAuthStore((s) => s.user);

  const [users, setUsers] = useState<AuthUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [busy, setBusy] = useState(false);

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("public");

  async function load() {
    try {
      const res = await api<{ users: AuthUser[] }>("/api/admin/users");
      setUsers(res.users);
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
      await api("/api/admin/users", {
        method: "POST",
        body: { username, email, password, role },
      });
      setUsername("");
      setEmail("");
      setPassword("");
      setRole("public");
      setShowCreate(false);
      setNotice("User created.");
      await load();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(id: string, next: UserRole) {
    setError(null);
    setNotice(null);
    try {
      await api(`/api/admin/users/${id}/role`, {
        method: "PATCH",
        body: { role: next },
      });
      setNotice("Role updated.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      await load(); // resync the select with the server truth
    }
  }

  async function removeUser(id: string) {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    setError(null);
    setNotice(null);
    try {
      await api(`/api/admin/users/${id}`, { method: "DELETE" });
      setNotice("User deleted.");
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <HeroBackdrop />
      <main className="relative z-10 mx-auto max-w-3xl px-5 py-16">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link
              to="/admin"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" /> Admin panel
            </Link>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              User management
            </h1>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowCreate((v) => !v)}
            className="gap-1.5"
          >
            <Plus className="size-4" /> New user
          </Button>
        </div>

        {notice && <p className="mt-4 text-sm text-[#078b87]">{notice}</p>}
        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        {/* Create user form */}
        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="mt-6 rounded-3xl border border-primary/15 bg-white/70 p-6 backdrop-blur-xl shadow-sm"
          >
            <h2 className="text-lg font-semibold">Create a user</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                aria-label="Username"
                className={inputClass}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                aria-label="Email"
                className={inputClass}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 8 characters)"
                aria-label="Password"
                className={inputClass}
              />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                aria-label="Role"
                className={cn(inputClass, "appearance-none")}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="text-foreground">
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="submit"
              disabled={busy || !username.trim() || !email.trim() || !password}
              className="mt-4"
            >
              {busy ? "Creating…" : "Create user"}
            </Button>
          </form>
        )}

        {/* User table */}
        <div className="mt-6 overflow-hidden rounded-3xl border border-primary/15 bg-white/70 backdrop-blur-xl shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-primary/15 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3.5 font-medium">User</th>
                  <th className="px-4 py-3.5 font-medium">Email</th>
                  <th className="px-4 py-3.5 font-medium">Role</th>
                  <th className="px-4 py-3.5 font-medium">Verified</th>
                  <th className="px-4 py-3.5 font-medium" aria-label="Actions" />
                </tr>
              </thead>
              <tbody className="divide-y divide-primary/10">
                {users.map((u) => {
                  const isSelf = u.id === me?.id;
                  return (
                    <tr key={u.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">
                            {u.username}
                          </span>
                          {isSelf && <Badge variant="default">you</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={u.role}
                          disabled={isSelf}
                          onChange={(e) =>
                            changeRole(u.id, e.target.value as UserRole)
                          }
                          className={cn(
                            "rounded-lg border border-primary/20 bg-white/80 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-primary/60",
                            isSelf && "cursor-not-allowed opacity-50",
                          )}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r} className="text-foreground">
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.emailVerified ? "outline" : "subtle"}>
                          {u.emailVerified ? "Verified" : "Pending"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => removeUser(u.id)}
                          disabled={isSelf}
                          title={isSelf ? "You cannot delete yourself" : "Delete user"}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500",
                            isSelf && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-muted-foreground",
                          )}
                        >
                          <Trash2 className="size-3.5" /> Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {users.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No users found.</p>
            )}
          </div>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          You cannot change your own role or delete yourself.{" "}
          <Badge variant="default">admin</Badge> has full access,{" "}
          <Badge variant="subtle">editor</Badge> can edit, and{" "}
          <Badge variant="outline">public</Badge> is a regular member.
        </p>
      </main>
    </div>
  );
}
