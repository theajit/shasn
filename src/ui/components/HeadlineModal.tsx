import { useMemo, useState } from "react";
import Modal from "./Modal";
import ArtPopCard from "./ArtPopCard";
import type { GameState } from "@/engine/types";
import { HEADLINE_CARDS } from "@/data/cards/headline";
import headlineArt from "@/assets/art/headline.png";
import { useDispatch } from "@/ui/hooks/useDispatch";
import { activePlayer, isVolatileSlot } from "@/engine/selectors";

interface Props { state: GameState; }

interface SlotChoice {
  key: string;
  zoneId: string;
  slotIdx: number;
  label: string;
}

export default function HeadlineModal({ state }: Props) {
  const dispatch = useDispatch();
  const active = activePlayer(state);
  const nextId = state.decks.headline[0] ?? null;
  const card = nextId ? HEADLINE_CARDS.find((item) => item.id === nextId) : null;
  const kind = card?.effect.kind;
  const [sourceKey, setSourceKey] = useState("");
  const [targetKey, setTargetKey] = useState("");

  const movableVoters = useMemo<SlotChoice[]>(() => state.board.zones.flatMap((zone) =>
    state.zones[zone.id].slots.flatMap((voter, slotIdx) => {
      if (!voter || voter.playerId !== active.id || voter.isMajority || isVolatileSlot(state, zone.id, slotIdx)) return [];
      const hasTarget = zone.adjacent.some((adjacentId) => state.zones[adjacentId]?.slots.some((slot) => slot === null));
      if (!hasTarget) return [];
      return [{ key: `${zone.id}:${slotIdx}`, zoneId: zone.id, slotIdx, label: `${zone.name} — voter position ${slotIdx + 1}` }];
    }),
  ), [active.id, state]);

  const selectedSource = movableVoters.find((choice) => choice.key === sourceKey);
  const targetSlots = useMemo<SlotChoice[]>(() => {
    if (!selectedSource) return [];
    const sourceZone = state.board.zones.find((zone) => zone.id === selectedSource.zoneId);
    if (!sourceZone) return [];
    return sourceZone.adjacent.flatMap((zoneId) => {
      const zone = state.board.zones.find((item) => item.id === zoneId);
      if (!zone) return [];
      return state.zones[zoneId].slots.flatMap((slot, slotIdx) => slot === null
        ? [{ key: `${zoneId}:${slotIdx}`, zoneId, slotIdx, label: `${zone.name} — empty position ${slotIdx + 1}` }]
        : []);
    });
  }, [selectedSource, state]);
  const selectedTarget = targetSlots.find((choice) => choice.key === targetKey);

  const submit = () => {
    let params: Record<string, unknown> = {};
    if (kind === "moveVoter") {
      if (!selectedSource || !selectedTarget) return;
      params = {
        fromZone: selectedSource.zoneId,
        fromSlotIdx: selectedSource.slotIdx,
        toZone: selectedTarget.zoneId,
        toSlotIdx: selectedTarget.slotIdx,
      };
    }
    dispatch({ t: "resolveHeadline", params });
  };

  const canResolve = kind !== "moveVoter" || Boolean(selectedSource && selectedTarget);

  return (
    <Modal title={`Headline — ${active.name}'s turn`} closable={false} wide>
      <div className="space-y-3">
        <div className="text-xs text-neutral-400">{state.pendingHeadlines} headline{state.pendingHeadlines === 1 ? "" : "s"} pending.</div>
        {card ? <>
          <ArtPopCard image={headlineArt} eyebrow="Headline" name={card.name} description={card.description} />
          <div className="text-[10px] text-neutral-500">effect: {card.effect.kind}</div>
        </> : <div className="text-sm text-neutral-300">Drawing next headline…</div>}

        {kind === "moveVoter" ? (
          <div className="space-y-3 rounded border border-neutral-800 bg-neutral-900/60 p-3">
            <div className="text-xs text-neutral-300">Choose one eligible voter, then choose an empty position in an adjacent zone.</div>
            {movableVoters.length ? <>
              <label className="block text-xs text-neutral-400">
                Your voter
                <select value={sourceKey} onChange={(event) => { setSourceKey(event.target.value); setTargetKey(""); }} className={selectClass}>
                  <option value="">Select a voter…</option>
                  {movableVoters.map((choice) => <option key={choice.key} value={choice.key}>{choice.label}</option>)}
                </select>
              </label>
              <label className="block text-xs text-neutral-400">
                Move to
                <select value={targetKey} disabled={!selectedSource} onChange={(event) => setTargetKey(event.target.value)} className={selectClass}>
                  <option value="">{selectedSource ? "Select an adjacent empty position…" : "Choose a voter first…"}</option>
                  {targetSlots.map((choice) => <option key={choice.key} value={choice.key}>{choice.label}</option>)}
                </select>
              </label>
            </> : <div className="text-xs text-amber-300">There are no eligible voters with space in an adjacent zone. Resolve to skip this effect.</div>}
          </div>
        ) : null}

        <div className="flex justify-end">
          <button type="button" disabled={!canResolve && movableVoters.length > 0} onClick={submit} className="rounded bg-blue-700 px-3 py-1 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40">
            {kind === "moveVoter" && movableVoters.length === 0 ? "Skip & Resolve" : "Resolve"}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const selectClass = "mt-1 w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-2 text-sm disabled:opacity-50";
