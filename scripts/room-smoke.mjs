import { io } from "socket.io-client";

const roomServer = process.env.ROOM_SERVER_URL ?? "http://localhost:3000";
const host = io(roomServer);
const guest = io(roomServer);
const emit = (socket, event, payload) => new Promise((resolve) => socket.emit(event, payload, resolve));

const created = await emit(host, "room:create", { name: "Host", color: "red" });
if (!created.ok) throw new Error(created.error);
const joined = await emit(guest, "room:join", { code: created.identity.roomCode, name: "Guest", color: "blue" });
if (!joined.ok) throw new Error(joined.error);
const started = await emit(host, "room:start", { roomCode: created.identity.roomCode, playerId: created.identity.playerId, options: { removeSensitive: false, mapMode: "original" } });
if (!started.ok) throw new Error(started.error);
guest.disconnect();
await new Promise((resolve) => setTimeout(resolve, 100));
const returningGuest = io(roomServer);
const wrongPin = await emit(returningGuest, "room:rejoin", { code: joined.identity.roomCode, name: "Guest", pin: "00000000" });
if (wrongPin.ok) throw new Error("Incorrect reconnect PIN was accepted");
const rejoined = await emit(returningGuest, "room:rejoin", { code: joined.identity.roomCode, name: "Guest", pin: joined.identity.reconnectPin });
if (!rejoined.ok || rejoined.identity.playerId !== joined.identity.playerId) throw new Error(rejoined.error ?? "Guest did not reclaim the same seat");
const rejected = await emit(returningGuest, "game:action", { roomCode: rejoined.identity.roomCode, playerId: rejoined.identity.playerId, action: { t: "acknowledgeHandoff" } });
if (rejected.ok) throw new Error("Non-active player action was accepted");
const accepted = await emit(host, "game:action", { roomCode: created.identity.roomCode, playerId: created.identity.playerId, action: { t: "acknowledgeHandoff" } });
if (!accepted.ok) throw new Error(accepted.error);
console.log(`room ${created.identity.roomCode}: create, join, PIN rejoin, start, and turn authorization passed`);
host.disconnect();
returningGuest.disconnect();
