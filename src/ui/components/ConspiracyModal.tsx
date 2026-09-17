import { useMemo, useState } from "react";
import Modal from "./Modal";
import ArtPopCard from "./ArtPopCard";
import type { ConspiracyEffectKind, GameState, PlayerId, Resource } from "@/engine/types";
import { CONSPIRACY_CARDS } from "@/data/cards/conspiracy";
import { useDispatch } from "@/ui/hooks/useDispatch";
import { activePlayer, isVolatileSlot } from "@/engine/selectors";
import { RESOURCE_LABEL } from "./ResourceTrack";
import conspiracyArt from "@/assets/art/conspiracy.png";

interface Props { state: GameState; initialCardId?: string; onClose: () => void; }
interface VoterChoice { key: string; zoneId: string; slotIdx: number; playerId: PlayerId; label: string; }

export default function ConspiracyModal({ state, initialCardId, onClose }: Props) {
  const dispatch = useDispatch();
  const active = activePlayer(state);
  const opponents = state.players.filter((player) => player.id !== active.id);
  const [cardId, setCardId] = useState(initialCardId ?? active.conspiracyHand[0] ?? "");
  const [targetPlayerId, setTargetPlayerId] = useState<PlayerId>(opponents[0]?.id ?? "");
  const [voterKey, setVoterKey] = useState("");
  const [swapA, setSwapA] = useState("");
  const [swapB, setSwapB] = useState("");
  const [resourceChoice, setResourceChoice] = useState<Resource>("funds");
  const [revealedCardId, setRevealedCardId] = useState<string | null>(null);

  const card = CONSPIRACY_CARDS.find((item) => item.id === cardId);
  const kind: ConspiracyEffectKind | undefined = card?.effect.kind;
  const voterChoices = useMemo<VoterChoice[]>(() => state.board.zones.flatMap((zone) =>
    state.zones[zone.id].slots.flatMap((voter, slotIdx) => {
      if (!voter || voter.isMajority || isVolatileSlot(state, zone.id, slotIdx)) return [];
      const owner = state.players.find((player) => player.id === voter.playerId);
      return [{
        key: `${zone.id}:${slotIdx}`,
        zoneId: zone.id,
        slotIdx,
        playerId: voter.playerId,
        label: `${zone.name} — ${owner?.name ?? voter.playerId}, position ${slotIdx + 1}`,
      }];
    }),
  ), [state]);
  const opponentVoters = voterChoices.filter((choice) => choice.playerId !== active.id);
  const chosenVoter = opponentVoters.find((choice) => choice.key === voterKey);
  const firstSwap = voterChoices.find((choice) => choice.key === swapA);
  const secondSwap = voterChoices.find((choice) => choice.key === swapB);
  const targetOpponent = opponents.find((player) => player.id === targetPlayerId);

  const canPlay = Boolean(card) && (
    kind === "discardOpponentVoter" ? Boolean(chosenVoter)
      : kind === "peekConspiracy" ? Boolean(targetOpponent?.conspiracyHand.length)
      : kind === "swapVoters" ? Boolean(firstSwap && secondSwap && swapA !== swapB)
      : true
  );

  const submit = () => {
    if (!card) return;
    let params: Record<string, unknown> = {};
    if (kind === "discardOpponentVoter" && chosenVoter) {
      params = { targetPlayerId: chosenVoter.playerId, zoneId: chosenVoter.zoneId, slotIdx: chosenVoter.slotIdx };
    } else if (kind === "peekConspiracy") {
      params = { targetPlayerId };
    } else if (kind === "gainResources") {
      params = { resources: { funds: 2, [resourceChoice]: resourceChoice === "funds" ? 3 : 1 } };
    } else if (kind === "swapVoters" && firstSwap && secondSwap) {
      params = { zoneA: firstSwap.zoneId, slotA: firstSwap.slotIdx, zoneB: secondSwap.zoneId, slotB: secondSwap.slotIdx };
    }
    dispatch({ t: "playConspiracy", cardId: card.id, params });
    if (kind === "peekConspiracy" && targetOpponent) {
      setRevealedCardId(targetOpponent.conspiracyHand[0] ?? null);
      return;
    }
    onClose();
  };

  return (
    <Modal title="Play Conspiracy Card" onClose={onClose} wide>
      <div className="space-y-4">
        <label className="block text-xs text-neutral-400">Card
          <select className={selectClass} value={cardId} onChange={(event) => { setCardId(event.target.value); setVoterKey(""); setSwapA(""); setSwapB(""); }}>
            {active.conspiracyHand.length === 0 ? <option value="">No cards available</option> : null}
            {active.conspiracyHand.map((id, index) => {
              const item = CONSPIRACY_CARDS.find((candidate) => candidate.id === id);
              return <option key={`${id}-${index}`} value={id}>{item?.name ?? id}</option>;
            })}
          </select>
        </label>

        {card ? <ArtPopCard image={conspiracyArt} eyebrow="Conspiracy" name={card.name} description={card.description}>
          <div className="text-[10px] text-neutral-300/90">Cost already paid when purchased</div>
        </ArtPopCard> : null}

        {kind === "discardOpponentVoter" ? (
          <Choice label="Opponent voter to discard" value={voterKey} onChange={setVoterKey} options={opponentVoters} empty="No eligible opponent voters" />
        ) : null}

        {kind === "peekConspiracy" ? (
          <label className="block text-xs text-neutral-400">Opponent
            <select className={selectClass} value={targetPlayerId} onChange={(event) => setTargetPlayerId(event.target.value)}>
              {opponents.map((player) => <option key={player.id} value={player.id}>{player.name} ({player.conspiracyHand.length} cards)</option>)}
            </select>
            {revealedCardId ? <span className="mt-2 block rounded border border-amber-800 bg-amber-950/30 px-3 py-2 text-sm text-amber-200">Revealed card: {CONSPIRACY_CARDS.find((item) => item.id === revealedCardId)?.name ?? revealedCardId}</span> : null}
          </label>
        ) : null}

        {kind === "gainResources" ? (
          <label className="block text-xs text-neutral-400">Choose the additional resource
            <select className={selectClass} value={resourceChoice} onChange={(event) => setResourceChoice(event.target.value as Resource)}>
              {(["funds", "clout", "media", "trust"] as Resource[]).map((resource) => <option key={resource} value={resource}>{RESOURCE_LABEL[resource]}</option>)}
            </select>
            <span className="mt-1 block text-neutral-500">You receive 2 Funds plus 1 of the selected resource.</span>
          </label>
        ) : null}

        {kind === "extraVoterCard" ? (
          <div className="rounded border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-xs text-neutral-300">After playing this card, click any open Voter Card. Its resource cost will be waived automatically.</div>
        ) : null}

        {kind === "swapVoters" ? <div className="grid gap-3 sm:grid-cols-2">
          <Choice label="First voter" value={swapA} onChange={setSwapA} options={voterChoices} empty="No eligible voters" />
          <Choice label="Second voter" value={swapB} onChange={setSwapB} options={voterChoices.filter((choice) => choice.key !== swapA)} empty="No second voter available" />
        </div> : null}

        <div className="flex justify-end gap-2">
          {revealedCardId ? <button type="button" onClick={onClose} className="rounded bg-blue-700 px-3 py-1 hover:bg-blue-600">Done</button> : <>
          <button type="button" onClick={onClose} className="rounded border border-neutral-600 px-3 py-1 hover:bg-neutral-800">Cancel</button>
          <button type="button" disabled={!canPlay} onClick={submit} className="rounded bg-blue-700 px-3 py-1 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40">Play Card</button>
          </>}
        </div>
      </div>
    </Modal>
  );
}

function Choice({ label, value, onChange, options, empty }: { label: string; value: string; onChange: (value: string) => void; options: VoterChoice[]; empty: string }) {
  return <label className="block text-xs text-neutral-400">{label}
    <select className={selectClass} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="">{options.length ? "Select…" : empty}</option>
      {options.map((choice) => <option key={choice.key} value={choice.key}>{choice.label}</option>)}
    </select>
  </label>;
}

const selectClass = "mt-1 w-full rounded border border-neutral-700 bg-neutral-800 px-2 py-2 text-sm";
