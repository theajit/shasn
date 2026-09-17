import { useState } from "react";
import type { GameState, Resource } from "@/engine/types";
import { RESOURCES } from "@/engine/types";
import { activePlayer, conspiracyPrice } from "@/engine/selectors";
import { useDispatch } from "@/ui/hooks/useDispatch";
import Modal from "./Modal";
import { RESOURCE_BG, RESOURCE_COLOR, RESOURCE_LABEL, ResourceCoin } from "./ResourceTrack";

interface Props {
  state: GameState;
  onClose: () => void;
}

export default function BuyConspiracyModal({ state, onClose }: Props) {
  const dispatch = useDispatch();
  const player = activePlayer(state);
  const price = conspiracyPrice(state) ?? 0;
  const [payment, setPayment] = useState<Record<Resource, number>>({
    funds: 0,
    clout: 0,
    media: 0,
    trust: 0,
  });
  const paid = RESOURCES.reduce((total, resource) => total + payment[resource], 0);
  const canConfirm = paid === price && RESOURCES.every(
    (resource) => payment[resource] <= player.resources[resource],
  );

  return (
    <Modal title="Buy Conspiracy" onClose={onClose}>
      <div className="space-y-4">
        <div className="text-sm text-neutral-300">
          Pay exactly <strong className="text-amber-300">{price}</strong> resources in any combination.
        </div>
        <div className="grid grid-cols-4 gap-2">
          {RESOURCES.map((resource) => (
            <div key={resource} className={`rounded border p-2 text-center ${RESOURCE_BG[resource]}`}>
              <div className={`inline-flex items-center gap-1 text-xs font-bold ${RESOURCE_COLOR[resource]}`}>
                <ResourceCoin resource={resource} size="xs" /> {RESOURCE_LABEL[resource]}
              </div>
              <div className="text-[10px] text-neutral-400">available {player.resources[resource]}</div>
              <div className="mt-2 flex items-center justify-center gap-2">
                <button type="button" onClick={() => setPayment((current) => ({ ...current, [resource]: Math.max(0, current[resource] - 1) }))} className="rounded border border-neutral-700 bg-neutral-900 px-2 hover:bg-neutral-800">−</button>
                <span className="w-5 tabular-nums">{payment[resource]}</span>
                <button type="button" onClick={() => setPayment((current) => {
                  if (paid >= price || current[resource] >= player.resources[resource]) return current;
                  return { ...current, [resource]: current[resource] + 1 };
                })} className="rounded border border-neutral-700 bg-neutral-900 px-2 hover:bg-neutral-800">+</button>
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-neutral-400">Selected: {paid}/{price}</div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-neutral-600 px-3 py-1 hover:bg-neutral-800">Cancel</button>
          <button type="button" disabled={!canConfirm} onClick={() => {
            dispatch({ t: "buyConspiracy", payment });
            onClose();
          }} className="rounded bg-blue-700 px-3 py-1 hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40">
            Pay {price} & Buy
          </button>
        </div>
      </div>
    </Modal>
  );
}
