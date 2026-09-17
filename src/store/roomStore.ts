import { create } from "zustand";
import { io, type Socket } from "socket.io-client";
import type { Action, PlayerColor } from "@/engine/types";
import type { RoomAck, RoomIdentity, RoomSnapshot, StartRoomOptions } from "@/online/types";
import type { TradeBundle } from "@/engine/types";
import { useGameStore } from "./gameStore";

type PlayMode = "menu" | "local" | "online";
type LobbyIntent = "create" | "join";
interface RoomStore {
  mode: PlayMode;
  lobbyIntent: LobbyIntent | null;
  snapshot: RoomSnapshot | null;
  identity: RoomIdentity | null;
  connecting: boolean;
  error: string | null;
  chooseLocal: () => void;
  backToMenu: () => void;
  createRoom: (name: string, color: PlayerColor) => void;
  joinRoom: (code: string, name: string, color: PlayerColor) => void;
  resumeRoom: () => void;
  startRoom: (options: StartRoomOptions) => void;
  dispatchOnline: (action: Action) => void;
  proposeTrade: (partnerId: string, give: TradeBundle, receive: TradeBundle) => void;
  respondToTrade: (tradeId: string, accept: boolean) => void;
  leaveRoom: () => void;
}

const SESSION_KEY = "shashn-online:room-session";
let socket: Socket | null = null;

function getSocket() {
  if (socket) return socket;
  socket = io(import.meta.env.VITE_ROOM_SERVER_URL || window.location.origin);
  socket.on("room:snapshot", (snapshot: RoomSnapshot) => {
    useRoomStore.setState({ snapshot, connecting: false, error: null });
    useGameStore.getState().replaceState(snapshot.game);
  });
  socket.on("connect_error", () => useRoomStore.setState({ connecting: false, error: "Could not connect to the room server" }));
  return socket;
}

function saveIdentity(value: RoomIdentity) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(value));
}

function readIdentity(): RoomIdentity | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null"); } catch { return null; }
}

function acceptAck(ack: RoomAck) {
  if (!ack.ok || !ack.identity) {
    useRoomStore.setState({ connecting: false, error: ack.error ?? "Room request failed" });
    return;
  }
  saveIdentity(ack.identity);
  useRoomStore.setState({ mode: "online", identity: ack.identity, connecting: false, error: null });
}

export const useRoomStore = create<RoomStore>((set, get) => ({
  mode: "menu",
  lobbyIntent: null,
  snapshot: null,
  identity: null,
  connecting: false,
  error: null,
  chooseLocal: () => set({ mode: "local", error: null }),
  backToMenu: () => set({ mode: "menu", lobbyIntent: null, error: null }),
  createRoom: (name, color) => {
    set({ connecting: true, error: null });
    getSocket().emit("room:create", { name, color }, acceptAck);
  },
  joinRoom: (code, name, color) => {
    set({ connecting: true, error: null });
    getSocket().emit("room:join", { code: code.toUpperCase(), name, color }, acceptAck);
  },
  resumeRoom: () => {
    const saved = readIdentity();
    if (!saved) return set({ error: "No saved room session" });
    set({ mode: "online", lobbyIntent: null, identity: saved, connecting: true, error: null });
    getSocket().emit("room:resume", saved, acceptAck);
  },
  startRoom: (options) => {
    const identity = get().identity;
    if (!identity) return;
    getSocket().emit("room:start", { roomCode: identity.roomCode, playerId: identity.playerId, options }, (ack: RoomAck) => {
      if (!ack.ok) set({ error: ack.error ?? "Could not start game" });
    });
  },
  dispatchOnline: (action) => {
    const identity = get().identity;
    if (!identity) return;
    getSocket().emit("game:action", { roomCode: identity.roomCode, playerId: identity.playerId, action }, (ack: RoomAck) => {
      if (!ack.ok) useGameStore.getState().setError(ack.error ?? "Action rejected");
    });
  },
  proposeTrade: (partnerId, give, receive) => {
    const identity = get().identity;
    if (!identity) return;
    getSocket().emit("trade:propose", { roomCode: identity.roomCode, playerId: identity.playerId, partnerId, give, receive }, (ack: RoomAck) => {
      if (!ack.ok) useGameStore.getState().setError(ack.error ?? "Could not propose trade");
    });
  },
  respondToTrade: (tradeId, accept) => {
    const identity = get().identity;
    if (!identity) return;
    getSocket().emit("trade:respond", { roomCode: identity.roomCode, playerId: identity.playerId, tradeId, accept }, (ack: RoomAck) => {
      if (!ack.ok) useGameStore.getState().setError(ack.error ?? "Could not respond to trade");
    });
  },
  leaveRoom: () => {
    localStorage.removeItem(SESSION_KEY);
    socket?.disconnect();
    socket = null;
    useGameStore.getState().replaceState(null);
    set({ mode: "menu", lobbyIntent: null, snapshot: null, identity: null, connecting: false, error: null });
  },
}));

export function hasRoomSession() {
  return readIdentity() !== null;
}
