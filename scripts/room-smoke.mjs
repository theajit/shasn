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
const rejected = await emit(guest, "game:action", { roomCode: joined.identity.roomCode, playerId: joined.identity.playerId, action: { t: "acknowledgeHandoff" } });
if (rejected.ok) throw new Error("Non-active player action was accepted");
const accepted = await emit(host, "game:action", { roomCode: created.identity.roomCode, playerId: created.identity.playerId, action: { t: "acknowledgeHandoff" } });
if (!accepted.ok) throw new Error(accepted.error);
console.log(`room ${created.identity.roomCode}: create, join, start, and turn authorization passed`);
host.disconnect();
guest.disconnect();
