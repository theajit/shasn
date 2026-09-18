import type { Action, GameState, PlayerColor, PlayerId, TradeBundle } from "@/engine/types";

export interface PendingTrade {
  id: string;
  proposerId: PlayerId;
  partnerId: PlayerId;
  give: TradeBundle;
  receive: TradeBundle;
}

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
  pendingTrade: PendingTrade | null;
}

export interface RoomIdentity {
  roomCode: string;
  playerId: PlayerId;
  playerName: string;
  reconnectToken: string;
  reconnectPin: string;
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

export interface RejoinRoomPayload {
  code: string;
  name: string;
  pin: string;
}

export interface TradeProposalPayload {
  roomCode: string;
  playerId: PlayerId;
  partnerId: PlayerId;
  give: TradeBundle;
  receive: TradeBundle;
}

export interface TradeResponsePayload {
  roomCode: string;
  playerId: PlayerId;
  tradeId: string;
  accept: boolean;
}
