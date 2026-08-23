import type { Peer } from "../../shared/types/realtime";

export interface RemotePeer extends Peer {
  x: number;
  y: number;
  /** Whether the cursor has been seen moving (hidden until first move). */
  active: boolean;
}

export interface ActiveReaction {
  key: number;
  emoji: string;
  x: number;
  y: number;
  color: string;
}

export type RealtimeStatus = "connecting" | "connected" | "disconnected";

export interface UseRealtime {
  status: RealtimeStatus;
  self: Peer | null;
  others: RemotePeer[];
  count: number;
  reactions: ActiveReaction[];
  moveCursor: (x: number, y: number) => void;
  sendReaction: (emoji: string, x: number, y: number) => void;
}
