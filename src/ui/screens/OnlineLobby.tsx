import { useState } from "react";
import type { PlayerColor } from "@/engine/types";
import { PLAYER_COLORS } from "@/engine/types";
import { useRoomStore } from "@/store/roomStore";
import PlayerColorSwatch, { PLAYER_COLOR_LABEL } from "@/ui/components/PlayerColorSwatch";

export default function OnlineLobby() {
  const { lobbyIntent, snapshot, identity, connecting, error, createRoom, joinRoom, startRoom, leaveRoom } = useRoomStore();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [color, setColor] = useState<PlayerColor>("red");
  const [removeSensitive, setRemoveSensitive] = useState(false);
  const [originalMap, setOriginalMap] = useState(true);
  const [copied, setCopied] = useState(false);
  const me = snapshot?.players.find((player) => player.id === identity?.playerId);
  const isJoining = lobbyIntent === "join";

  const copyRoomCode = async () => {
    if (!snapshot) return;
    await navigator.clipboard.writeText(snapshot.code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (!snapshot || !identity) {
    return (
      <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100">
        <div className="mx-auto max-w-lg space-y-5 rounded-xl border border-neutral-700 bg-neutral-900 p-6">
          <div>
            <h1 className="text-2xl font-bold">{isJoining ? "Join a room" : "Create a room"}</h1>
            <p className="mt-1 text-sm text-neutral-400">
              {isJoining
                ? "Enter your details and the six-character code shared by the host."
                : "Choose your name and colour, then create a private room to invite friends."}
            </p>
          </div>
          <label className="block text-sm">Display name<input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} maxLength={24} placeholder="Your name" /></label>
          <div>
            <div className="mb-2 text-sm">Voter colour</div>
            <div className="flex gap-2">{PLAYER_COLORS.map((item) => (
              <button key={item} type="button" title={PLAYER_COLOR_LABEL[item]} onClick={() => setColor(item)} className={`rounded-full p-1 ${color === item ? "ring-2 ring-white" : "opacity-60"}`}><PlayerColorSwatch color={item} size="md" ring={false} /></button>
            ))}</div>
          </div>
          {isJoining ? (
            <div className="flex items-end gap-2 border-t border-neutral-800 pt-4">
              <label className="flex-1 text-sm">Room code<input className={`${inputClass} uppercase tracking-widest`} value={code} onChange={(event) => setCode(event.target.value.toUpperCase().slice(0, 6))} placeholder="ABC123" /></label>
              <button type="button" disabled={connecting || !name.trim() || code.length !== 6} onClick={() => joinRoom(code, name, color)} className="rounded bg-blue-700 px-4 py-2 hover:bg-blue-600 disabled:opacity-40">Join room</button>
            </div>
          ) : (
            <button type="button" disabled={connecting || !name.trim()} onClick={() => createRoom(name, color)} className={primaryClass}>Create room</button>
          )}
          {error ? <div className="rounded border border-red-800 bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</div> : null}
          <button type="button" onClick={leaveRoom} className="text-sm text-neutral-400 hover:text-white">Back</button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100">
      <div className="mx-auto max-w-xl space-y-5 rounded-xl border border-neutral-700 bg-neutral-900 p-6">
        <div className="text-center">
          <div className="text-xs uppercase tracking-widest text-neutral-400">Room code</div>
          <button type="button" onClick={copyRoomCode} aria-label={`Copy room code ${snapshot.code}`} className="mt-2 rounded-lg border border-neutral-700 bg-neutral-950 px-6 py-3 text-4xl font-black tracking-[0.25em] transition hover:border-blue-400 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-blue-400">
            {snapshot.code}
          </button>
          <div aria-live="polite" className={`mt-2 text-xs ${copied ? "text-emerald-400" : "text-neutral-400"}`}>
            {copied ? "Copied!" : "Tap the code to copy"}
          </div>
        </div>
        <div className="space-y-2">{snapshot.players.map((player, index) => (
          <div key={player.id} className="flex items-center gap-3 rounded border border-neutral-700 bg-neutral-800/60 p-3">
            <PlayerColorSwatch color={player.color} size="md" /><span className="flex-1 font-semibold">{index + 1}. {player.name}{player.id === identity.playerId ? " (you)" : ""}</span>
            {player.isHost ? <span className="text-xs text-amber-300">Host</span> : null}<span className={`h-2 w-2 rounded-full ${player.connected ? "bg-emerald-400" : "bg-neutral-600"}`} />
          </div>
        ))}</div>
        <div className="text-center text-sm text-neutral-400">Share the code. The host can start when 2–5 players have joined.</div>
        {me?.isHost ? <div className="space-y-3 border-t border-neutral-800 pt-4">
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={removeSensitive} onChange={(event) => setRemoveSensitive(event.target.checked)} /> Remove sensitive ideology cards</label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={originalMap} onChange={(event) => setOriginalMap(event.target.checked)} /> Use original map</label>
          <button type="button" disabled={snapshot.players.length < 2} onClick={() => startRoom({ removeSensitive, mapMode: originalMap ? "original" : "dynamic" })} className={primaryClass}>Start online game</button>
        </div> : <div className="text-center text-sm text-neutral-400">Waiting for the host to start…</div>}
        {error ? <div className="text-sm text-red-300">{error}</div> : null}
        <button type="button" onClick={leaveRoom} className="text-sm text-neutral-400 hover:text-white">Leave room</button>
      </div>
    </main>
  );
}

const inputClass = "mt-1 w-full rounded border border-neutral-700 bg-neutral-950 px-3 py-2";
const primaryClass = "w-full rounded bg-red-800 px-4 py-2 font-semibold hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40";
