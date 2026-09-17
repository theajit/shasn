import type { Action, GameState, PlayerColor, PlayerId } from "@/engine/types";

export interface RoomPlayer {
  id: PlayerId;
  name: string;
  color: PlayerColor;
  connected: boolean;
  isHost: boolean;
}

export interface RoomSnapshot {
  code: string;
  players: RoomPlayer[];
  game: GameState | null;
}

export interface RoomIdentity {
  roomCode: string;
  playerId: PlayerId;
  reconnectToken: string;
}

export interface RoomAck {
  ok: boolean;
  error?: string;
  identity?: RoomIdentity;
}

export interface StartRoomOptions {
  removeSensitive: boolean;
  mapMode: "original" | "dynamic";
}

export interface ClientActionPayload {
  roomCode: string;
  playerId: PlayerId;
  action: Action;
}
