import { create } from "zustand";
import { api, errorMessage } from "@/lib/api";

export interface AssetFile {
  id: string;
  name: string;
  url: string;
  key: string;
  contentType: string;
  size: number;
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

interface AssetManagerState {
  // File manager
  files: AssetFile[];
  filesLoading: boolean;
  filesError: string | null;
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
  uploadFile: (worldId: string, file: File) => Promise<void>;
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

export const useAssetManagerStore = create<AssetManagerState>((set, get) => ({
  files: [],
  filesLoading: false,
  filesError: null,
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

  uploadFile: async (worldId, file) => {
    set({ filesLoading: true, filesError: null });
    try {
      const res = await api<{ uploadUrl: string; contentType: string }>(
        `/api/admin/worlds/${worldId}/assets/presign`,
        {
          method: "POST",
          body: {
            filename: file.name,
            contentType: file.type || "application/octet-stream",
            size: file.size,
          },
        },
      );
      await fetch(res.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": res.contentType },
      });
      await get().loadFiles(worldId);
    } catch (e) {
      set({ filesError: errorMessage(e) });
    } finally {
      set({ filesLoading: false });
    }
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
