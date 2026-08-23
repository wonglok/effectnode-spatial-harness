import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useMetaverseStore } from "@/stores/metaverse";
import { useAvatarStore } from "@/stores/avatar";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import type { World } from "../../shared/types/world";
import { GameWorld } from "@/components/metaverse/world";
import { ChatWindow } from "@/components/chat/chat-window";
import { VoiceRecordButton } from "@/components/chat/voice-record-button";
import { VRMPicker } from "@/components/metaverse/VRMAvatar";
import { GameHUD } from "@/components/game/hud";

export function WorldView() {
  const { worldID } = useParams<{ worldID: string }>();
  const navigate = useNavigate();
  const pid = worldID ?? "default";
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  // Read state with selectors (avoids re-renders from high-frequency player moves)
  const status = useMetaverseStore((s) => s.status);
  const self = useMetaverseStore((s) => s.self);
  const onlineCount = useMetaverseStore(
    (s) => s.players.length + (s.self ? 1 : 0),
  );
  const messages = useMetaverseStore((s) => s.messages);

  // Send actions are stable references
  const sendName = useMetaverseStore((s) => s.sendName);
  const sendChat = useMetaverseStore((s) => s.sendChat);
  const sendVoice = useMetaverseStore((s) => s.sendVoice);
  const sendAvatar = useMetaverseStore((s) => s.sendAvatar);

  const avatarUrl = useAvatarStore((s) => s.avatarUrl);
  const avatarThumb = useAvatarStore((s) => s.avatarThumb);
  const setAvatar = useAvatarStore((s) => s.setAvatar);
  const [showPicker, setShowPicker] = useState(false);
  const [world, setWorld] = useState<World | null>(null);
  const [worldStatus, setWorldStatus] = useState<
    "loading" | "found" | "not-found"
  >("loading");

  // Download the world data; if it can't be found, don't render the game.
  useEffect(() => {
    if (!worldID) {
      setWorldStatus("not-found");
      return;
    }
    setWorldStatus("loading");
    api<{ world: World }>(`/api/worlds/${worldID}`)
      .then((r) => {
        setWorld(r.world);
        setWorldStatus("found");
      })
      .catch(() => setWorldStatus("not-found"));
  }, [worldID]);

  // Connect the WebSocket for this place (only once the world exists).
  useEffect(() => {
    if (worldStatus !== "found") return;
    const storedUrl = localStorage.getItem("lambobo-avatar-url");
    return useMetaverseStore.getState().connect(pid, storedUrl);
  }, [pid, worldStatus]);

  // Send avatar update when it changes
  useEffect(() => {
    if (avatarUrl) {
      sendAvatar(avatarUrl);
    }
  }, [avatarUrl]);

  if (worldStatus === "loading") {
    return (
      <div className="relative flex h-full w-full items-center justify-center bg-black">
        <p className="text-white/60">Loading world…</p>
      </div>
    );
  }

  if (worldStatus === "not-found" || !world) {
    return (
      <div className="relative flex h-full w-full flex-col items-center justify-center gap-3 bg-black px-6 text-center">
        <h1 className="text-2xl font-semibold text-white">World not found</h1>
        <p className="text-sm text-white/60">
          This world doesn&apos;t exist or isn&apos;t published.
        </p>
        <button
          onClick={() => navigate("/")}
          className="text-sm text-white/80 underline underline-offset-4 hover:text-white"
        >
          Back home
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* ── HUD: info pill + menu ─────────────────────────────── */}
      <GameHUD
        worldTitle={world.name}
        status={status}
        onlineCount={onlineCount}
        playerName={self?.name ?? ""}
        avatarThumb={avatarThumb}
        isAdmin={isAdmin}
        onEditWorld={() => navigate(`/world/${worldID}/edit`)}
        onSaveName={sendName}
        onOpenAvatar={() => setShowPicker(true)}
        onToggleChat={() => {
          // Click the chat toggle button in the DOM
          document
            .querySelector<HTMLButtonElement>("[data-chat-toggle]")
            ?.click();
        }}
        onLeave={() => {
          let search = new URLSearchParams(location.search);
          if (search.get("from") === "admin-world-manager") {
            navigate("/admin/world-manager");
          } else {
            navigate("/");
          }
        }}
      />

      {/* ── Avatar picker overlay ─────────────────────────────── */}
      {showPicker && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowPicker(false)}
          />
          <div className="absolute right-4 top-14 z-50">
            <VRMPicker
              selectedId={avatarUrl ?? undefined}
              onSelect={(item: any) => {
                const url = `https://d2upc1jytt7esc.cloudfront.net/vrm-avatars/${item.project_id}/${item.name}/model.vrm`;
                const thumb = `https://d2upc1jytt7esc.cloudfront.net/vrm-avatars/${item.project_id}/${item.name}/thumbnail.gif`;
                setAvatar(url, thumb);
                setShowPicker(false);
              }}
              onClose={() => setShowPicker(false)}
            />
          </div>
        </>
      )}

      {/* ── 3D World ──────────────────────────────────────────── */}
      <GameWorld
        avatarUrl={avatarUrl}
        placeURL={world.sceneURL ?? "/assets/place/church.glb"}
      />

      {/* ── Center-bottom mic button ──────────────────────────── */}
      <div className="absolute left-1/2 bottom-5 lg:bottom-17 -translate-x-1/2 z-30">
        <VoiceRecordButton onSendVoice={sendVoice} />
      </div>

      {/* ── Chat overlay ──────────────────────────────────────── */}
      <ChatWindow
        messages={messages}
        onSend={sendChat}
        onSendVoice={sendVoice}
        selfId={self?.id ?? null}
      />
    </div>
  );
}
