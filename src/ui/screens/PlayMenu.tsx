import { hasSavedGame } from "@/store/gameStore";
import { getSavedRoomSession, useRoomStore } from "@/store/roomStore";

export default function PlayMenu() {
  const chooseLocal = useRoomStore((state) => state.chooseLocal);
  const resumeRoom = useRoomStore((state) => state.resumeRoom);
  const backToMenu = useRoomStore((state) => state.backToMenu);
  const savedRoom = getSavedRoomSession();
  const chooseOnline = (lobbyIntent: "create" | "join") =>
    useRoomStore.setState({
      mode: "online",
      lobbyIntent,
      snapshot: null,
      identity: null,
      error: null,
    });

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-100">
      <div className="mx-auto max-w-5xl text-center">
        <div className="text-xs uppercase tracking-[0.35em] text-red-400">The political strategy game</div>
        <h1 className="mt-3 text-5xl font-black">SHASN Online</h1>
        <p className="mx-auto mt-4 max-w-xl text-neutral-400">Play around one table or create a private room for friends joining from anywhere.</p>
        {savedRoom ? (
          <button type="button" onClick={resumeRoom} className="mx-auto mt-6 flex w-full max-w-md items-center justify-between rounded-xl border border-blue-700/70 bg-blue-950/40 px-5 py-4 text-left transition hover:border-blue-400 hover:bg-blue-950/70">
            <span>
              <span className="block text-lg font-bold">Continue as {savedRoom.playerName || "previous player"}</span>
              <span className="mt-1 block text-xs uppercase tracking-widest text-blue-300">Room {savedRoom.roomCode}</span>
            </span>
            <span aria-hidden className="text-2xl text-blue-300">→</span>
          </button>
        ) : null}
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <button type="button" onClick={chooseLocal} className="rounded-xl border border-neutral-700 bg-neutral-900 p-6 text-left hover:border-neutral-500">
            <span className="block text-xl font-bold">Pass & play</span>
            <span className="mt-2 block text-sm text-neutral-400">One device, 2–5 players in the same place.</span>
            {hasSavedGame() ? <span className="mt-3 block text-xs text-emerald-400">Saved local game available</span> : null}
          </button>
          <button type="button" onClick={() => chooseOnline("create")} className="rounded-xl border border-red-900 bg-red-950/30 p-6 text-left hover:border-red-600">
            <span className="block text-xl font-bold">Create room</span>
            <span className="mt-2 block text-sm text-neutral-400">Start a private room and invite remote players.</span>
          </button>
          <button type="button" onClick={() => chooseOnline("join")} className="rounded-xl border border-red-900 bg-red-950/30 p-6 text-left hover:border-red-600">
            <span className="block text-xl font-bold">Join room</span>
            <span className="mt-2 block text-sm text-neutral-400">Enter a room code and join an existing game.</span>
          </button>
        </div>
        <button type="button" onClick={backToMenu} className="sr-only">Menu</button>
      </div>
    </main>
  );
}
