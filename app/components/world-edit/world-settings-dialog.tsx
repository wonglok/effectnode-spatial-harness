import { useEffect } from "react";
import { useNavigate } from "react-router";
import { api } from "@/lib/api";
import { WorldSettingsForm, type WorldSettingsInput } from "./world-settings-form";
import type { World } from "../../../shared/types/world";

/** Popup modal that hosts the world metadata form. */
export function WorldSettingsDialog({
  open,
  world,
  onClose,
}: {
  open: boolean;
  world: World | null;
  onClose: () => void;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open || !world) return null;

  async function handleSave(values: WorldSettingsInput) {
    await api(`/api/admin/worlds/${world!.id}`, {
      method: "PATCH",
      body: values,
    });
    navigate("/admin/world-manager");
  }

  async function handleDelete() {
    await api(`/api/admin/worlds/${world!.id}`, { method: "DELETE" });
    navigate("/admin/world-manager");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/10 bg-neutral-900 p-6 shadow-[0_16px_48px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.04)]">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">World settings</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg px-2 py-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            ✕
          </button>
        </div>

        <WorldSettingsForm
          world={world}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
}
