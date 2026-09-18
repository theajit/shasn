// Bottom action bar. Buttons on the left open turn-action modals; the
// optional `trailing` slot fills the right edge (the deck-stats strip
// from Game.tsx).
// Note: Influence is triggered by clicking a voter card on the HQ Mat (which
// lets the player pick which card), so there is no Influence button here.
// End Turn lives in the top bar beside the active player's name.
import type { ReactNode } from "react";

interface Props {
  onGerrymander: () => void;
  onTrade: () => void;
  onPlayConspiracy: () => void;
  canPlayConspiracy: boolean;
  inActionsPhase: boolean;
  trailing?: ReactNode;
}

export default function ActionBar({
  onGerrymander,
  onTrade,
  onPlayConspiracy,
  canPlayConspiracy,
  inActionsPhase,
  trailing,
}: Props) {
  const btn =
    "px-3 py-2 rounded-md border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 focus:outline-none focus:ring-2 focus:ring-white text-sm";
  return (
    <div className="flex shrink-0 items-center gap-1.5 overflow-x-auto border-t border-neutral-800 bg-neutral-950 p-2 sm:flex-wrap sm:gap-2 sm:p-3">
      <button type="button" onClick={onGerrymander} disabled={!inActionsPhase} className={btn}>
        Gerrymander
      </button>
      <button type="button" onClick={onTrade} disabled={!inActionsPhase} className={btn}>
        Trade
      </button>
      <button type="button" onClick={onPlayConspiracy} disabled={!canPlayConspiracy} className={btn}>
        Play Conspiracy
      </button>
      {trailing ? <div className="ml-auto shrink-0">{trailing}</div> : null}
    </div>
  );
}
