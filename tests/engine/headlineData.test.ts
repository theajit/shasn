import { describe, expect, it } from "vitest";
import { applyAction } from "@/engine/reducer";
import { createInitialState } from "@/engine/state";

describe("production headline data", () => {
  it("resolves National Day of Solidarity for every player", () => {
    const state = createInitialState({
      players: [
        { name: "Player 1", color: "red" },
        { name: "Player 2", color: "blue" },
      ],
      seed: 1,
    });
    state.phase = "headlines";
    state.pendingHeadlines = 1;
    state.decks.headline = ["h-003"];

    const before = state.players.map((player) => player.resources.trust);
    const result = applyAction(state, { t: "resolveHeadline", params: {} });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.players.map((player) => player.resources.trust)).toEqual(
      before.map((trust) => trust + 1),
    );
    expect(result.state.pendingHeadlines).toBe(0);
  });

  it("moves a voter only to an adjacent zone", () => {
    const state = createInitialState({
      players: [
        { name: "Player 1", color: "red" },
        { name: "Player 2", color: "blue" },
      ],
      seed: 1,
      mapMode: "original",
    });
    state.phase = "headlines";
    state.pendingHeadlines = 1;
    state.decks.headline = ["h-005"];
    state.zones.nw.slots[0] = { playerId: "p1", isMajority: false };

    const result = applyAction(state, {
      t: "resolveHeadline",
      params: { fromZone: "nw", fromSlotIdx: 0, toZone: "n", toSlotIdx: 0 },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.zones.nw.slots[0]).toBeNull();
    expect(result.state.zones.n.slots[0]?.playerId).toBe("p1");
  });

  it("rejects a non-adjacent resettlement target", () => {
    const state = createInitialState({
      players: [
        { name: "Player 1", color: "red" },
        { name: "Player 2", color: "blue" },
      ],
      seed: 1,
      mapMode: "original",
    });
    state.phase = "headlines";
    state.pendingHeadlines = 1;
    state.decks.headline = ["h-005"];
    state.zones.nw.slots[0] = { playerId: "p1", isMajority: false };

    const result = applyAction(state, {
      t: "resolveHeadline",
      params: { fromZone: "nw", fromSlotIdx: 0, toZone: "se", toSlotIdx: 0 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Target zone must be adjacent");
  });
});
