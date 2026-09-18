import express from "express";
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { createInitialState } from "../src/engine/state";
import { applyAction } from "../src/engine/reducer";
import type { PlayerColor, PlayerId } from "../src/engine/types";
import type { ClientActionPayload, RoomAck, RoomIdentity, RoomSnapshot, StartRoomOptions, TradeProposalPayload, TradeResponsePayload } from "../src/online/types";

interface ServerPlayer {
  id: PlayerId;
  name: string;
  color: PlayerColor;
  connected: boolean;
  isHost: boolean;
  socketId: string;
  reconnectToken: string;
}

interface Room {
  code: string;
  players: ServerPlayer[];
  game: RoomSnapshot["game"];
  pendingTrade: RoomSnapshot["pendingTrade"];
}

const rooms = new Map<string, Room>();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: true, credentials: true } });

function makeCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from(randomBytes(6), (byte) => alphabet[byte % alphabet.length]).join("");
  } while (rooms.has(code));
  return code;
}

function snapshot(room: Room): RoomSnapshot {
  return {
    code: room.code,
    players: room.players.map(({ id, name, color, connected, isHost }) => ({ id, name, color, connected, isHost })),
    game: room.game,
    pendingTrade: room.pendingTrade,
  };
}

function broadcast(room: Room) {
  io.to(room.code).emit("room:snapshot", snapshot(room));
}

function identity(room: Room, player: ServerPlayer): RoomIdentity {
  return { roomCode: room.code, playerId: player.id, reconnectToken: player.reconnectToken };
}

io.on("connection", (socket) => {
  socket.on("room:create", ({ name, color }: { name: string; color: PlayerColor }, ack: (result: RoomAck) => void) => {
    const room: Room = { code: makeCode(), players: [], game: null, pendingTrade: null };
    const player: ServerPlayer = {
      id: "p1", name: name.trim() || "Host", color, connected: true, isHost: true,
      socketId: socket.id, reconnectToken: randomBytes(24).toString("hex"),
    };
    room.players.push(player);
    rooms.set(room.code, room);
    socket.join(room.code);
    ack({ ok: true, identity: identity(room, player) });
    broadcast(room);
  });

  socket.on("room:join", ({ code, name, color }: { code: string; name: string; color: PlayerColor }, ack: (result: RoomAck) => void) => {
    const room = rooms.get(code.trim().toUpperCase());
    if (!room) return ack({ ok: false, error: "Room not found" });
    if (room.game) return ack({ ok: false, error: "This game has already started" });
    if (room.players.length >= 5) return ack({ ok: false, error: "Room is full" });
    if (room.players.some((player) => player.color === color)) return ack({ ok: false, error: "That colour is already taken" });
    const player: ServerPlayer = {
      id: `p${room.players.length + 1}`, name: name.trim() || `Player ${room.players.length + 1}`,
      color, connected: true, isHost: false, socketId: socket.id,
      reconnectToken: randomBytes(24).toString("hex"),
    };
    room.players.push(player);
    socket.join(room.code);
    ack({ ok: true, identity: identity(room, player) });
    broadcast(room);
  });

  socket.on("room:resume", ({ roomCode, playerId, reconnectToken }: RoomIdentity, ack: (result: RoomAck) => void) => {
    const room = rooms.get(roomCode);
    const player = room?.players.find((item) => item.id === playerId && item.reconnectToken === reconnectToken);
    if (!room || !player) return ack({ ok: false, error: "Room session expired" });
    player.connected = true;
    player.socketId = socket.id;
    socket.join(room.code);
    ack({ ok: true, identity: identity(room, player) });
    socket.emit("room:snapshot", snapshot(room));
    broadcast(room);
  });

  socket.on("room:start", ({ roomCode, playerId, options }: { roomCode: string; playerId: PlayerId; options: StartRoomOptions }, ack: (result: RoomAck) => void) => {
    const room = rooms.get(roomCode);
    const player = room?.players.find((item) => item.id === playerId);
    if (!room || !player?.isHost) return ack({ ok: false, error: "Only the host can start" });
    if (room.players.length < 2) return ack({ ok: false, error: "At least two players are required" });
    room.game = createInitialState({
      players: room.players.map(({ name, color }) => ({ name, color })),
      removeSensitive: options.removeSensitive,
      mapMode: options.mapMode,
    });
    ack({ ok: true });
    broadcast(room);
  });

  socket.on("game:action", (payload: ClientActionPayload, ack: (result: RoomAck) => void) => {
    const room = rooms.get(payload.roomCode);
    const player = room?.players.find((item) => item.id === payload.playerId && item.socketId === socket.id);
    if (!room?.game || !player) return ack({ ok: false, error: "Game room unavailable" });
    if (room.pendingTrade) return ack({ ok: false, error: "Waiting for a trade response" });
    const active = room.game.players[room.game.activePlayerIdx];
    if (active.id !== player.id) return ack({ ok: false, error: `Waiting for ${active.name}'s turn` });
    const result = applyAction(room.game, payload.action);
    if (!result.ok) return ack({ ok: false, error: result.error });
    room.game = result.state;
    ack({ ok: true });
    broadcast(room);
  });

  socket.on("trade:propose", (payload: TradeProposalPayload, ack: (result: RoomAck) => void) => {
    const room = rooms.get(payload.roomCode);
    const player = room?.players.find((item) => item.id === payload.playerId && item.socketId === socket.id);
    if (!room?.game || !player) return ack({ ok: false, error: "Game room unavailable" });
    if (room.pendingTrade) return ack({ ok: false, error: "Another trade is awaiting a response" });
    const active = room.game.players[room.game.activePlayerIdx];
    if (active.id !== player.id) return ack({ ok: false, error: `Waiting for ${active.name}'s turn` });
    if (!room.players.some((item) => item.id === payload.partnerId)) return ack({ ok: false, error: "Trade partner not found" });
    const action = { t: "trade" as const, withPlayerId: payload.partnerId, give: payload.give, receive: payload.receive };
    const validation = applyAction(room.game, action);
    if (!validation.ok) return ack({ ok: false, error: validation.error });
    room.pendingTrade = {
      id: randomBytes(12).toString("hex"),
      proposerId: player.id,
      partnerId: payload.partnerId,
      give: payload.give,
      receive: payload.receive,
    };
    ack({ ok: true });
    broadcast(room);
  });

  socket.on("trade:respond", (payload: TradeResponsePayload, ack: (result: RoomAck) => void) => {
    const room = rooms.get(payload.roomCode);
    const player = room?.players.find((item) => item.id === payload.playerId && item.socketId === socket.id);
    const trade = room?.pendingTrade;
    if (!room?.game || !player || !trade || trade.id !== payload.tradeId) return ack({ ok: false, error: "Trade proposal is no longer available" });
    if (trade.partnerId !== player.id) return ack({ ok: false, error: "Only the selected trade partner can respond" });
    if (payload.accept) {
      const result = applyAction(room.game, { t: "trade", withPlayerId: trade.partnerId, give: trade.give, receive: trade.receive });
      if (!result.ok) {
        room.pendingTrade = null;
        broadcast(room);
        return ack({ ok: false, error: result.error });
      }
      room.game = result.state;
    }
    room.pendingTrade = null;
    ack({ ok: true });
    broadcast(room);
  });

  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      const player = room.players.find((item) => item.socketId === socket.id);
      if (!player) continue;
      player.connected = false;
      broadcast(room);
    }
  });
});

const here = dirname(fileURLToPath(import.meta.url));
const clientDir = resolve(here, "../dist");
app.use(express.static(clientDir));
app.use((_request, response) => response.sendFile(resolve(clientDir, "index.html")));

const port = Number(process.env.PORT ?? 3000);
httpServer.listen(port, () => console.log(`SHASN room server listening on ${port}`));
