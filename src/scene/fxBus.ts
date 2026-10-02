import type { TargetAxis } from "../game";

export type MarkSource = "player" | "hint" | "auto";

/** One-shot moments the scene and the soundtrack react to. */
export type FxEvent =
  | { type: "levelStart"; size: number }
  | {
      type: "mark";
      row: number;
      col: number;
      mark: "selected" | "erased";
      source: MarkSource;
      streak: number;
      delayMs: number;
    }
  | { type: "miss"; row: number; col: number }
  | { type: "blocked"; row: number; col: number }
  | { type: "lineMatched"; axis: TargetAxis; index: number; delayMs: number }
  | { type: "unlock" }
  | { type: "win" }
  | { type: "lose" };

type Listener = (event: FxEvent) => void;

const listeners = new Set<Listener>();

export function emitFx(event: FxEvent) {
  for (const listener of listeners) {
    listener(event);
  }
}

export function onFx(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
