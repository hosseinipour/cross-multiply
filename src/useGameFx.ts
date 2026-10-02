import { useEffect, useRef } from "react";
import type { SessionState } from "./appState";
import { sound } from "./audio/sound";
import { describeUnlocks, isColResolved, isRowResolved } from "./game";
import { emitFx, onFx, type FxEvent } from "./scene/fxBus";
import type { WorldTheme } from "./scene/worlds";

const AUTO_CLEAR_BASE_MS = 80;
const AUTO_CLEAR_STEP_MS = 45;

function playFor(event: FxEvent) {
  switch (event.type) {
    case "mark":
      if (event.source === "hint") {
        sound.play("hint", { delayMs: event.delayMs });
      } else if (event.source === "auto") {
        sound.play("autoClear", { delayMs: event.delayMs });
      } else {
        sound.play(event.mark === "selected" ? "select" : "erase", { streak: event.streak });
      }
      break;
    case "miss":
      sound.play("miss");
      break;
    case "blocked":
      sound.play("blocked");
      break;
    case "lineMatched":
      sound.play("lineMatched", { delayMs: event.delayMs });
      break;
    case "unlock":
      sound.play("unlock", { delayMs: 200 });
      break;
    case "win":
      sound.play("win", { delayMs: 250 });
      break;
    case "lose":
      sound.play("lose", { delayMs: 150 });
      break;
    case "levelStart":
      sound.play("levelStart");
      break;
  }
}

/**
 * Watches session transitions and turns them into one-shot effects, so the
 * game rules stay unaware of particles and sound.
 */
export function useGameFx(
  session: SessionState,
  runId: number,
  streak: number,
  world: WorldTheme,
) {
  const previous = useRef<{ session: SessionState; runId: number } | null>(null);

  useEffect(() => {
    sound.setWorld(world);
  }, [world]);

  useEffect(() => onFx(playFor), []);

  useEffect(() => {
    const last = previous.current;
    previous.current = { session, runId };
    const { puzzle, marks } = session;

    if (!last || last.runId !== runId || last.session.puzzle.id !== puzzle.id) {
      emitFx({ type: "levelStart", size: puzzle.size });
      return;
    }

    const prev = last.session;
    if (prev === session) {
      return;
    }

    const autoOrder = new Map(
      session.autoCleared.map((cell, index) => [`${cell.row}-${cell.col}`, index]),
    );
    // The winning move leaves focusKey untouched, so count hints instead.
    const fromHint = session.hintsUsed > prev.hintsUsed;
    let lastDelay = 0;

    for (let row = 0; row < puzzle.size; row += 1) {
      for (let col = 0; col < puzzle.size; col += 1) {
        const before = prev.marks[row][col];
        const after = marks[row][col];

        if (before !== "hidden" || after === "hidden") {
          continue;
        }

        const autoIndex = autoOrder.get(`${row}-${col}`);
        const auto = autoIndex !== undefined;
        const delayMs = auto ? AUTO_CLEAR_BASE_MS + autoIndex * AUTO_CLEAR_STEP_MS : 0;
        lastDelay = Math.max(lastDelay, delayMs);

        emitFx({
          type: "mark",
          row,
          col,
          mark: after,
          source: auto ? "auto" : fromHint ? "hint" : "player",
          streak,
          delayMs,
        });
      }
    }

    if (session.focusKey !== prev.focusKey && session.focusKey?.includes("-miss-")) {
      const [row, col] = session.focusKey.split("-").map(Number);
      emitFx({ type: "miss", row, col });
    }

    let matchedCount = 0;
    for (const axis of ["row", "column"] as const) {
      for (let index = 0; index < puzzle.size; index += 1) {
        const resolved = axis === "row" ? isRowResolved : isColResolved;
        if (!resolved(puzzle, prev.marks, index) && resolved(puzzle, marks, index)) {
          emitFx({
            type: "lineMatched",
            axis,
            index,
            delayMs: lastDelay + 60 + matchedCount * 140,
          });
          matchedCount += 1;
        }
      }
    }

    if (
      session.status === "playing" &&
      ((prev.toolLocked && !session.toolLocked) ||
        describeUnlocks(puzzle, prev.marks, marks).length > 0)
    ) {
      emitFx({ type: "unlock" });
    }

    if (prev.status === "playing" && session.status === "won") {
      emitFx({ type: "win" });
    } else if (prev.status === "playing" && session.status === "lost") {
      emitFx({ type: "lose" });
    }
  }, [runId, session, streak]);
}
