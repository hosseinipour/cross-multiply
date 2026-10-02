import type { SessionState } from "./appState";
import {
  getDelayedCellProgress,
  getSpotlightProgress,
  isCellBlockedByCommitment,
  isCellBlockedByNoEcho,
  isCellBlockedBySpotlight,
  isCellCloaked,
  isCellLocked,
  isCellSealed,
} from "./game";

export type CellBlock = "seal" | "cloak" | "spot" | "echo" | "hold";

export const BLOCK_LABELS: Record<CellBlock, string> = {
  seal: "sealed until more correct marks",
  cloak: "cloaked until more correct marks",
  spot: "finish the spotlight line first",
  echo: "mark a different line next",
  hold: "stay on your committed line",
};

export function getCellBlock(
  session: SessionState,
  row: number,
  col: number,
): CellBlock | null {
  const { puzzle, marks } = session;

  if (isCellSealed(puzzle, marks, row, col)) {
    return "seal";
  }

  if (isCellCloaked(puzzle, marks, row, col)) {
    return "cloak";
  }

  if (isCellBlockedBySpotlight(puzzle, marks, row, col)) {
    return "spot";
  }

  if (isCellBlockedByNoEcho(session.noEchoLine, row, col)) {
    return "echo";
  }

  if (isCellBlockedByCommitment(session.activeCommitment, row, col)) {
    return "hold";
  }

  return null;
}

/** Player-facing reason a tile will not take a mark right now. */
export function explainCellBlock(session: SessionState, block: CellBlock) {
  const { puzzle, marks } = session;

  if (block === "seal" || block === "cloak") {
    const progress = getDelayedCellProgress(
      puzzle,
      marks,
      block === "seal" ? puzzle.sealedCells : puzzle.cloakedCells,
    );
    const noun = block === "seal" ? "Sealed" : "Cloaked";

    return progress
      ? `${noun} tile. Opens after ${progress.required} correct marks (${progress.current} so far).`
      : `${noun} tile.`;
  }

  if (block === "spot") {
    const spotlight = getSpotlightProgress(puzzle, marks);
    return spotlight
      ? `Spotlight first: ${spotlight.current}/${spotlight.required} correct marks on ${spotlight.axis} ${spotlight.index + 1}.`
      : "Finish the spotlight line first.";
  }

  if (block === "echo" && session.noEchoLine) {
    return `No echo: your next mark must leave ${session.noEchoLine.axis} ${session.noEchoLine.index + 1}.`;
  }

  if (block === "hold" && session.activeCommitment) {
    return `Committed: stay on ${session.activeCommitment.axis} ${session.activeCommitment.index + 1} for now.`;
  }

  return "That tile is not open yet.";
}

export function describeCell(session: SessionState, row: number, col: number) {
  const { puzzle } = session;
  const mark = session.marks[row][col];
  const block = mark === "hidden" ? getCellBlock(session, row, col) : null;
  const value = block === "cloak" ? "hidden value" : String(puzzle.board[row][col]);
  const state =
    mark === "selected"
      ? "selected"
      : mark === "erased"
        ? "erased"
        : block
          ? BLOCK_LABELS[block]
          : "open";

  return `Row ${row + 1}, column ${col + 1}: ${value}, ${state}${
    isCellLocked(puzzle, row, col) ? ", prefilled" : ""
  }`;
}
