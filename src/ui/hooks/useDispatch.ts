// Convenience wrapper around the zustand store's dispatch. Returns a stable
// function reference and surfaces errors through a simple toast list kept in
// React state local to this hook's caller.
import { useCallback } from "react";
import type { Action } from "@/engine/types";
import { useGameStore } from "@/store/gameStore";
import { useRoomStore } from "@/store/roomStore";

export function useDispatch() {
  const dispatch = useGameStore((s) => s.dispatch);
  const mode = useRoomStore((s) => s.mode);
  const dispatchOnline = useRoomStore((s) => s.dispatchOnline);
  return useCallback(
    (action: Action) => {
      if (mode === "online") dispatchOnline(action);
      else dispatch(action);
    },
    [dispatch, dispatchOnline, mode],
  );
}

export function useLastError(): string | null {
  return useGameStore((s) => s.lastError);
}

export function useClearError() {
  return useGameStore((s) => s.clearError);
}
