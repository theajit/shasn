import { useGameStore } from "@/store/gameStore";
import { useRoomStore } from "@/store/roomStore";

export default function OnlineWaiting() {
  const state = useGameStore((item) => item.state)!;
  const snapshot = useRoomStore((item) => item.snapshot);
  const leaveRoom = useRoomStore((item) => item.leaveRoom);
  const active = state.players[state.activePlayerIdx];
  return (
    <main className="min-h-screen bg-neutral-950 p-6 text-neutral-100 grid place-items-center">
      <div className="w-full max-w-md rounded-xl border border-neutral-700 bg-neutral-900 p-6 text-center">
        <div className="text-xs uppercase tracking-widest text-neutral-500">Room {snapshot?.code}</div>
        <h1 className="mt-3 text-2xl font-bold">Waiting for {active.name}</h1>
        <p className="mt-2 text-sm text-neutral-400">Their turn is in progress. The board will update automatically after every move.</p>
        <div className="mt-5 space-y-2 text-left">{snapshot?.players.map((player) => <div key={player.id} className="flex justify-between rounded bg-neutral-800 px-3 py-2 text-sm"><span>{player.name}</span><span className={player.connected ? "text-emerald-400" : "text-neutral-500"}>{player.connected ? "Online" : "Disconnected"}</span></div>)}</div>
        <button type="button" onClick={leaveRoom} className="mt-6 text-sm text-neutral-400 hover:text-white">Leave room</button>
      </div>
    </main>
  );
}
