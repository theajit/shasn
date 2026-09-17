import { useMemo, useState } from "react";
import Modal from "./Modal";
import type { GameState, Ideologue, PlayerId, Resource } from "@/engine/types";
import { RESOURCES } from "@/engine/types";
import { IDEOLOGUE_INFO } from "@/data/ideologueInfo";
import { RESOURCE_LABEL } from "./ResourceTrack";
import { useDispatch } from "@/ui/hooks/useDispatch";

interface Props {
  state: GameState;
  ideologue: Ideologue;
  level: 3 | 5;
  onClose: () => void;
}

type Amounts = Record<Resource, number>;
const EMPTY_AMOUNTS: Amounts = { funds: 0, clout: 0, media: 0, trust: 0 };

export default function PowerModal({ state, ideologue, level, onClose }: Props) {
  const dispatch = useDispatch();
  const active = state.players[state.activePlayerIdx];
  const power = level === 3 ? IDEOLOGUE_INFO[ideologue].level3 : IDEOLOGUE_INFO[ideologue].level5;
  const powerKey = `${ideologue}.${level}`;
  const firstOpponent = state.players.find((player) => player.id !== active.id)?.id ?? "";

  const [payResource, setPayResource] = useState<Resource>("funds");
  const [resource, setResource] = useState<Resource>("funds");
  const [targetPlayerId, setTargetPlayerId] = useState<PlayerId>(firstOpponent);
  const [targetSlot, setTargetSlot] = useState("");
  const [zoneId, setZoneId] = useState(state.board.zones[0]?.id ?? "");
  const [firstSlot, setFirstSlot] = useState("");
  const [secondSlot, setSecondSlot] = useState("");
  const [take, setTake] = useState<Amounts>({ ...EMPTY_AMOUNTS });
  const [payment, setPayment] = useState<Amounts>({ ...EMPTY_AMOUNTS });

  const opponents = state.players.filter((player) => player.id !== active.id);
  const voterOptions = useMemo(
    () => state.board.zones.flatMap((zone) =>
      state.zones[zone.id].slots.flatMap((voter, slotIdx) => {
        if (!voter || zone.volatileSlotIndices.includes(slotIdx)) return [];
        const owner = state.players.find((player) => player.id === voter.playerId);
        return [{
          key: `${zone.id}:${slotIdx}`,
          zoneId: zone.id,
          slotIdx,
          playerId: voter.playerId,
          label: `${zone.name}, slot ${slotIdx + 1} — ${owner?.name ?? voter.playerId}`,
        }];
      }),
    ),
    [state],
  );

  const selectedVoter = voterOptions.find((option) => option.key === targetSlot);
  const idealistSlots = voterOptions.filter(
    (option) => option.zoneId === zoneId && option.playerId === targetPlayerId,
  );
  const discount = state.powerUsage["idealist.3.discountPending"] ?? 0;
  const idealistAnyCost = Math.max(0, 2 - discount);
  const paymentTotal = RESOURCES.reduce((sum, item) => sum + payment[item], 0);
  const takeTotal = RESOURCES.reduce((sum, item) => sum + take[item], 0);

  let canSubmit = true;
  if (powerKey === "capitalist.3") canSubmit = active.resources[payResource] > 0 && takeTotal >= 1 && takeTotal <= 2;
  if (powerKey === "capitalist.5") canSubmit = Boolean(selectedVoter);
  if (powerKey === "supremo.3") {
    const target = state.players.find((player) => player.id === targetPlayerId);
    canSubmit = Boolean(target && target.resources[resource] > 0);
  }
  if (powerKey === "supremo.5") {
    canSubmit = active.resources[payResource] > 0 && Boolean(selectedVoter && selectedVoter.playerId !== active.id);
  }
  if (powerKey === "idealist.5") {
    canSubmit = Boolean(firstSlot && secondSlot && firstSlot !== secondSlot)
      && payment.trust >= 2
      && paymentTotal === 2 + idealistAnyCost
      && RESOURCES.every((item) => payment[item] <= active.resources[item]);
  }

  const submit = () => {
    let params: Record<string, unknown> = {};
    switch (powerKey) {
      case "capitalist.3":
        params = { payResource, take };
        break;
      case "capitalist.5":
        if (!selectedVoter) return;
        params = { zoneId: selectedVoter.zoneId, slotIdx: selectedVoter.slotIdx };
        break;
      case "supremo.3":
        params = { targetPlayerId, resource };
        break;
      case "supremo.5":
        if (!selectedVoter) return;
        params = { payResource, zoneId: selectedVoter.zoneId, slotIdx: selectedVoter.slotIdx };
        break;
      case "idealist.5":
        params = {
          zoneId,
          targetPlayerId,
          slotIndices: [Number(firstSlot), Number(secondSlot)],
          anyPayment: payment,
        };
        break;
    }
    dispatch({ t: "useIdeologuePower", ideologue, level, params });
    onClose();
  };

  const isPassive = powerKey === "showstopper.5";

  return (
    <Modal title={`${power.name} — ${ideologue} L${level}`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-neutral-300">{power.description}</p>

        {powerKey === "capitalist.3" ? (
          <>
            <ResourceSelect label="Pay 1 resource" value={payResource} onChange={setPayResource} resources={active.resources} />
            <ResourceAmounts label="Take 1 or 2 resources" values={take} onChange={setTake} maxEach={2} />
            <Hint>{takeTotal}/2 resources selected</Hint>
          </>
        ) : null}

        {powerKey === "capitalist.5" ? (
          <VoterSelect label="Voter to evict" value={targetSlot} onChange={setTargetSlot} options={voterOptions} />
        ) : null}

        {powerKey === "supremo.3" ? (
          <>
            <PlayerSelect players={opponents} value={targetPlayerId} onChange={setTargetPlayerId} />
            <ResourceSelect label="Resource to take" value={resource} onChange={setResource} resources={state.players.find((player) => player.id === targetPlayerId)?.resources} />
          </>
        ) : null}

        {powerKey === "supremo.5" ? (
          <>
            <ResourceSelect label="Pay 1 resource" value={payResource} onChange={setPayResource} resources={active.resources} />
            <VoterSelect label="Opponent voter to discard" value={targetSlot} onChange={setTargetSlot} options={voterOptions.filter((option) => option.playerId !== active.id)} />
          </>
        ) : null}

        {powerKey === "showstopper.3" ? (
          <Hint>Your next influenced Voter Card this turn gains one additional voter.</Hint>
        ) : null}

        {powerKey === "showstopper.5" ? (
          <Hint>This is automatic: while Gerrymandering, you may move two voters per zone you control.</Hint>
        ) : null}

        {powerKey === "idealist.3" ? (
          <Hint>Your next Voter Card or Conspiracy purchase receives a one-resource discount.</Hint>
        ) : null}

        {powerKey === "idealist.5" ? (
          <>
            <PlayerSelect players={opponents} value={targetPlayerId} onChange={(id) => { setTargetPlayerId(id); setFirstSlot(""); setSecondSlot(""); }} />
            <label className="block text-xs text-neutral-300">
              <span className="mb-1 block">Zone</span>
              <select className={inputClass} value={zoneId} onChange={(event) => { setZoneId(event.target.value); setFirstSlot(""); setSecondSlot(""); }}>
                {state.board.zones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <VoterSelect label="First voter" value={firstSlot} onChange={setFirstSlot} options={idealistSlots} valueMode="slot" />
              <VoterSelect label="Second voter" value={secondSlot} onChange={setSecondSlot} options={idealistSlots} valueMode="slot" />
            </div>
            <ResourceAmounts label={`Payment: 2 Trust + any ${idealistAnyCost}`} values={payment} onChange={setPayment} maxEach={4} />
            <Hint>{paymentTotal}/{2 + idealistAnyCost} resources selected{discount ? ` (${discount} discount applied)` : ""}</Hint>
          </>
        ) : null}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-3 py-1 rounded border border-neutral-600 hover:bg-neutral-800">
            {isPassive ? "Got it" : "Cancel"}
          </button>
          {!isPassive ? (
            <button type="button" disabled={!canSubmit} onClick={submit} className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40">
              Activate
            </button>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}

const inputClass = "w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm";

function ResourceSelect({ label, value, onChange, resources }: { label: string; value: Resource; onChange: (value: Resource) => void; resources?: Record<Resource, number> }) {
  return (
    <label className="block text-xs text-neutral-300">
      <span className="mb-1 block">{label}</span>
      <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value as Resource)}>
        {RESOURCES.map((item) => <option key={item} value={item}>{RESOURCE_LABEL[item]}{resources ? ` (${resources[item]})` : ""}</option>)}
      </select>
    </label>
  );
}

function ResourceAmounts({ label, values, onChange, maxEach }: { label: string; values: Amounts; onChange: (values: Amounts) => void; maxEach: number }) {
  return (
    <fieldset>
      <legend className="mb-1 text-xs text-neutral-300">{label}</legend>
      <div className="grid grid-cols-4 gap-2">
        {RESOURCES.map((item) => (
          <label key={item} className="text-[10px] text-neutral-400">
            {RESOURCE_LABEL[item]}
            <input type="number" min={0} max={maxEach} value={values[item]} onChange={(event) => onChange({ ...values, [item]: Math.max(0, Math.min(maxEach, Number(event.target.value) || 0)) })} className={`${inputClass} mt-1`} />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function PlayerSelect({ players, value, onChange }: { players: GameState["players"]; value: PlayerId; onChange: (id: PlayerId) => void }) {
  return (
    <label className="block text-xs text-neutral-300">
      <span className="mb-1 block">Opponent</span>
      <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>
        {players.map((player) => <option key={player.id} value={player.id}>{player.name}</option>)}
      </select>
    </label>
  );
}

type VoterOption = { key: string; zoneId: string; slotIdx: number; playerId: PlayerId; label: string };
function VoterSelect({ label, value, onChange, options, valueMode = "key" }: { label: string; value: string; onChange: (value: string) => void; options: VoterOption[]; valueMode?: "key" | "slot" }) {
  return (
    <label className="block text-xs text-neutral-300">
      <span className="mb-1 block">{label}</span>
      <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select…</option>
        {options.map((option) => <option key={option.key} value={valueMode === "slot" ? String(option.slotIdx) : option.key}>{option.label}</option>)}
      </select>
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <div className="rounded border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-xs text-neutral-400">{children}</div>;
}
