import { create } from "zustand";
import { api, errorMessage } from "@/lib/api";
import { generateModelThumbnail, dataUrlToBlob } from "@/lib/thumbnail";
import { writeTempFile, removeTempFile } from "@/lib/opfs";

export interface AssetFile {
  id: string;
  name: string;
  url: string;
  key: string;
  contentType: string;
  size: number;
  thumbnailUrl: string | null;
  createdAt: string;
}

export interface ChatThreadItem {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMsg {
  id: string;
  role: "system" | "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface UploadItem {
  id: string;
  name: string;
  progress: number; // 0–100
  status: "uploading" | "done" | "error";
}

interface AssetManagerState {
  // File manager
  files: AssetFile[];
  filesLoading: boolean;
  filesError: string | null;
  // Upload progress
  uploads: UploadItem[];
  overallProgress: number; // 0–100
  // Chat
  threads: ChatThreadItem[];
  threadsLoading: boolean;
  activeThreadId: string | null;
  messages: ChatMsg[];
  messagesLoading: boolean;
  sending: boolean;
  chatError: string | null;

  reset: () => void;
  loadFiles: (worldId: string) => Promise<void>;
  uploadFiles: (worldId: string, files: File[]) => Promise<void>;
  deleteFile: (worldId: string, fileId: string) => Promise<void>;
  loadThreads: (worldId: string) => Promise<void>;
  createThread: (worldId: string) => Promise<string | null>;
  selectThread: (worldId: string, threadId: string) => Promise<void>;
  sendMessage: (
    worldId: string,
    threadId: string,
    content: string,
  ) => Promise<void>;
  deleteThread: (worldId: string, threadId: string) => Promise<void>;
}

/** PUT a blob to a presigned URL, reporting upload progress via XHR. */
function uploadWithProgress(
  url: string,
  body: Blob,
  contentType: string,
  onProgress: (loaded: number, total: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(e.loaded, e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.send(body);
  });
}

/** Presign + upload one file (with progress) + optional 3D thumbnail. */
async function uploadSingleFile(
  worldId: string,
  file: File,
  onProgress: (loaded: number) => void,
): Promise<void> {
  const res = await api<{
    uploadUrl: string;
    contentType: string;
    thumbnailUploadUrl?: string | null;
  }>(`/api/admin/worlds/${worldId}/assets/presign`, {
    method: "POST",
    body: {
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
    },
  });

  await uploadWithProgress(res.uploadUrl, file, res.contentType, (loaded) =>
    onProgress(loaded),
  );

  // Render + upload a thumbnail for 3D models (best-effort).
  if (res.thumbnailUploadUrl) {
    const objectUrl = URL.createObjectURL(file);
    try {
      const dataUrl = await generateModelThumbnail(objectUrl);
      await fetch(res.thumbnailUploadUrl, {
        method: "PUT",
        body: dataUrlToBlob(dataUrl),
        headers: { "Content-Type": "image/png" },
      });
    } catch {
      // ignore thumbnail failures — the upload itself succeeded.
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
}

export const useAssetManagerStore = create<AssetManagerState>((set, get) => ({
  files: [],
  filesLoading: false,
  filesError: null,
  uploads: [],
  overallProgress: 0,
  threads: [],
  threadsLoading: false,
  activeThreadId: null,
  messages: [],
  messagesLoading: false,
  sending: false,
  chatError: null,

  reset: () =>
    set({
      files: [],
      filesLoading: false,
      filesError: null,
      uploads: [],
      overallProgress: 0,
      threads: [],
      threadsLoading: false,
      activeThreadId: null,
      messages: [],
      messagesLoading: false,
      sending: false,
      chatError: null,
    }),

  loadFiles: async (worldId) => {
    set({ filesLoading: true, filesError: null });
    try {
      const res = await api<{ files: AssetFile[] }>(
        `/api/admin/worlds/${worldId}/assets`,
      );
      set({ files: res.files });
    } catch (e) {
      set({ filesError: errorMessage(e) });
    } finally {
      set({ filesLoading: false });
    }
  },

  uploadFiles: async (worldId, files) => {
    const list = files.filter(Boolean);
    if (list.length === 0) return;

    const totalBytes = list.reduce((n, f) => n + f.size, 0);
    const items: UploadItem[] = list.map((f) => ({
      id: crypto.randomUUID(),
      name: f.name,
      progress: 0,
      status: "uploading",
    }));
    set({ uploads: items, overallProgress: 0, filesError: null });

    const patchItem = (id: string, patch: Partial<UploadItem>) =>
      set((s) => ({
        uploads: s.uploads.map((u) => (u.id === id ? { ...u, ...patch } : u)),
      }));

    let doneBytes = 0;

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const item = items[i];
      try {
        await writeTempFile(worldId, file);
        try {
          await uploadSingleFile(worldId, file, (loaded) => {
            const pct = file.size > 0 ? (loaded / file.size) * 100 : 100;
            patchItem(item.id, { progress: Math.min(100, pct) });
            set({
              overallProgress:
                totalBytes > 0
                  ? Math.min(100, ((doneBytes + loaded) / totalBytes) * 100)
                  : 100,
            });
          });
          doneBytes += file.size;
          patchItem(item.id, { progress: 100, status: "done" });
        } finally {
          await removeTempFile(worldId, file.name);
        }
      } catch (e) {
        patchItem(item.id, { status: "error" });
        set({ filesError: errorMessage(e) });
      }
    }

    set({ overallProgress: 100 });
    await get().loadFiles(worldId);
    setTimeout(() => set({ uploads: [], overallProgress: 0 }), 2000);
  },

  deleteFile: async (worldId, fileId) => {
    set({ filesError: null });
    try {
      await api(`/api/admin/worlds/${worldId}/assets/${fileId}`, {
        method: "DELETE",
      });
      await get().loadFiles(worldId);
    } catch (e) {
      set({ filesError: errorMessage(e) });
    }
  },

  loadThreads: async (worldId) => {
    set({ threadsLoading: true });
    try {
      const res = await api<{ threads: ChatThreadItem[] }>(
        `/api/admin/worlds/${worldId}/chat/threads`,
      );
      set({ threads: res.threads });
    } catch (e) {
      set({ chatError: errorMessage(e) });
    } finally {
      set({ threadsLoading: false });
    }
  },

  createThread: async (worldId) => {
    set({ chatError: null });
    try {
      const res = await api<{ thread: ChatThreadItem }>(
        `/api/admin/worlds/${worldId}/chat/threads`,
        { method: "POST", body: {} },
      );
      set((s) => ({
        threads: [res.thread, ...s.threads],
        activeThreadId: res.thread.id,
        messages: [],
      }));
      return res.thread.id;
    } catch (e) {
      set({ chatError: errorMessage(e) });
      return null;
    }
  },

  selectThread: async (worldId, threadId) => {
    set({ activeThreadId: threadId, messagesLoading: true, chatError: null });
    try {
      const res = await api<{ messages: ChatMsg[] }>(
        `/api/admin/worlds/${worldId}/chat/messages?threadId=${threadId}`,
      );
      set({ messages: res.messages });
    } catch (e) {
      set({ chatError: errorMessage(e) });
    } finally {
      set({ messagesLoading: false });
    }
  },

  sendMessage: async (worldId, threadId, content) => {
    const tempUser: ChatMsg = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      messages: [...s.messages, tempUser],
      sending: true,
      chatError: null,
    }));
    try {
      const res = await api<{ userMessage: ChatMsg; assistantMessage: ChatMsg }>(
        `/api/admin/worlds/${worldId}/chat/messages`,
        { method: "POST", body: { threadId, content } },
      );
      set((s) => {
        const withoutTemp = s.messages.filter((m) => m.id !== tempUser.id);
        return {
          messages: [...withoutTemp, res.userMessage, res.assistantMessage],
        };
      });
      get().loadThreads(worldId);
    } catch (e) {
      set({ chatError: errorMessage(e) });
    } finally {
      set({ sending: false });
    }
  },

  deleteThread: async (worldId, threadId) => {
    set({ chatError: null });
    try {
      await api(
        `/api/admin/worlds/${worldId}/chat/threads?threadId=${threadId}`,
        { method: "DELETE" },
      );
      set((s) => ({
        threads: s.threads.filter((t) => t.id !== threadId),
        activeThreadId: s.activeThreadId === threadId ? null : s.activeThreadId,
        messages: s.activeThreadId === threadId ? [] : s.messages,
      }));
    } catch (e) {
      set({ chatError: errorMessage(e) });
    }
  },
}));
