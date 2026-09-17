import { hasSavedGame } from "@/store/gameStore";
import { hasRoomSession, useRoomStore } from "@/store/roomStore";

export default function PlayMenu() {
  const chooseLocal = useRoomStore((state) => state.chooseLocal);
  const resumeRoom = useRoomStore((state) => state.resumeRoom);
  const backToMenu = useRoomStore((state) => state.backToMenu);

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-neutral-100">
      <div className="mx-auto max-w-3xl text-center">
        <div className="text-xs uppercase tracking-[0.35em] text-red-400">The political strategy game</div>
        <h1 className="mt-3 text-5xl font-black">SHASN Online</h1>
        <p className="mx-auto mt-4 max-w-xl text-neutral-400">Play around one table or create a private room for friends joining from anywhere.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <button type="button" onClick={chooseLocal} className="rounded-xl border border-neutral-700 bg-neutral-900 p-6 text-left hover:border-neutral-500">
            <span className="block text-xl font-bold">Pass & play</span>
            <span className="mt-2 block text-sm text-neutral-400">One device, 2–5 players in the same place.</span>
            {hasSavedGame() ? <span className="mt-3 block text-xs text-emerald-400">Saved local game available</span> : null}
          </button>
          <button type="button" onClick={() => useRoomStore.setState({ mode: "online", snapshot: null, identity: null, error: null })} className="rounded-xl border border-red-900 bg-red-950/30 p-6 text-left hover:border-red-600">
            <span className="block text-xl font-bold">Online room</span>
            <span className="mt-2 block text-sm text-neutral-400">Create a code and invite remote players.</span>
          </button>
        </div>
        {hasRoomSession() ? (
          <button type="button" onClick={resumeRoom} className="mt-5 text-sm text-blue-300 underline hover:text-blue-200">Reconnect to my last room</button>
        ) : null}
        <button type="button" onClick={backToMenu} className="sr-only">Menu</button>
      </div>
    </main>
  );
}
