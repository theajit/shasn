// Root component. Reads phase from the zustand store and renders the right
// screen. If no game exists, shows Setup (the store handles persistence
// rehydration via `persist` middleware).
import { useGameStore } from "@/store/gameStore";
import Setup from "./screens/Setup";
import Handoff from "./screens/Handoff";
import Game from "./screens/Game";
import EndGame from "./screens/EndGame";
import PlayMenu from "./screens/PlayMenu";
import OnlineLobby from "./screens/OnlineLobby";
import OnlineWaiting from "./screens/OnlineWaiting";
import { useRoomStore } from "@/store/roomStore";

export default function App() {
  const state = useGameStore((s) => s.state);
  const mode = useRoomStore((s) => s.mode);
  const room = useRoomStore((s) => s.snapshot);
  const identity = useRoomStore((s) => s.identity);
  if (mode === "menu") return <PlayMenu />;
  if (mode === "online" && !room?.game) return <OnlineLobby />;
  if (!state) return mode === "online" ? <OnlineLobby /> : <Setup />;
  const isMyOnlineTurn = mode !== "online" || state.players[state.activePlayerIdx]?.id === identity?.playerId;
  switch (state.phase) {
    case "setup":
      return <Setup />;
    case "handoff":
      return !isMyOnlineTurn ? <OnlineWaiting /> : <Handoff />;
    case "ideology":
    case "actions":
    case "headlines":
      return <Game readOnly={!isMyOnlineTurn} />;
    case "ended":
      return <EndGame />;
    default: {
      // Exhaustiveness check — should never happen.
      const _exhaust: never = state.phase;
      void _exhaust;
      return <Setup />;
    }
  }
}
