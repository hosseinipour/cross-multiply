import type { CellMark, Puzzle } from "../game";
import {
  getTargetConcealment,
  getRowProgress,
  getVisibleTarget,
  isCellLocked,
  isRowResolved,
  type TargetAxis,
} from "../game";
import { HapticButton } from "./HapticButton";
import { TargetBadge } from "./TargetBadge";

function ColumnTarget({
  concealment,
  progress,
  resolved,
  target,
}: {
  target: number | null;
  concealment: "blind" | "deepFog" | "fog" | null;
  progress: number;
  resolved: boolean;
}) {
  return (
    <TargetBadge
      target={target}
      concealment={concealment}
      progress={progress}
      resolved={resolved}
    />
  );
}

function RowFragmentImpl({
  row,
  puzzle,
  marks,
  onPress,
  focusKey,
  activeCommitment,
}: {
  row: number;
  puzzle: Puzzle;
  marks: CellMark[][];
  onPress: (row: number, col: number) => void;
  focusKey: string | null;
  activeCommitment: { axis: TargetAxis; index: number } | null;
}) {
  const resolved = isRowResolved(puzzle, marks, row);
  const progress = getRowProgress(puzzle, marks, row);

  return (
    <>
      <TargetBadge
        target={getVisibleTarget(puzzle, marks, "row", row)}
        concealment={getTargetConcealment(puzzle, marks, "row", row)}
        progress={progress}
        resolved={resolved}
      />
      {Array.from({ length: puzzle.size }, (_, col) => {
        const mark = marks[row][col];
        const locked = isCellLocked(puzzle, row, col);
        const isPulse = focusKey?.startsWith(`${row}-${col}-`) ?? false;
        const isMiss = focusKey?.startsWith(`${row}-${col}-miss-`) ?? false;
        const blockedByCommitment = activeCommitment
          ? activeCommitment.axis === "row"
            ? activeCommitment.index !== row
            : activeCommitment.index !== col
          : false;

        return (
          <HapticButton
            key={`${row}-${col}`}
            type="button"
            onClick={() => onPress(row, col)}
            disabled={mark !== "hidden" || blockedByCommitment}
            haptic="none"
            className={`group relative aspect-square rounded-[0.9rem] border text-center transition duration-200 disabled:cursor-default sm:rounded-[1.15rem] ${
              mark === "selected"
                ? "border-[var(--cell-highlight-border)] [background:var(--cell-highlight)] text-[var(--cell-highlight-text)] shadow-[0_0_0_2px_rgba(255,255,255,0.15)]"
                : mark === "erased"
                  ? "border-[var(--cell-erased-border)] bg-[var(--cell-erased)] text-[var(--text-faint)]"
                  : blockedByCommitment
                    ? "border-[var(--cell-border)] bg-[var(--panel-muted)]/50 text-[var(--text-faint)] opacity-45"
                    : "border-[var(--cell-border)] bg-[var(--cell-bg)] text-[var(--text-primary)] hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:bg-[var(--cell-hover)]"
            } ${locked ? "shadow-[inset_0_0_0_1px_rgba(250,204,21,0.45)]" : ""} ${isPulse ? "animate-[pulse_0.45s_ease-out]" : ""}`}
          >
            <span
              className={`absolute inset-0 rounded-[0.85rem] sm:rounded-[1.1rem] ${
                mark === "selected"
                  ? "ring-2 ring-[var(--cell-highlight-ring)]"
                  : mark === "erased"
                    ? "ring-1 ring-black/10"
                    : "ring-0"
              }`}
            />
            <span
              className={`relative z-10 flex h-full items-center justify-center font-['Trebuchet_MS'] text-[clamp(1rem,2.5vw,2rem)] font-semibold sm:text-[clamp(1.2rem,3vw,2rem)] ${
                mark === "erased" ? "opacity-35" : ""
              }`}
            >
              {puzzle.board[row][col]}
            </span>
            {locked && (
              <span className="absolute left-2 top-2 rounded-full bg-amber-300/20 px-1.5 py-0.5 text-[0.45rem] font-semibold uppercase tracking-[0.2em] text-amber-100">
                Lock
              </span>
            )}
            {isMiss && (
              <span className="pointer-events-none absolute inset-0 rounded-[0.85rem] bg-rose-500/28 opacity-0 ring-2 ring-rose-300/70 [animation:wrongFlash_500ms_ease-out_forwards] sm:rounded-[1.1rem]" />
            )}
            {blockedByCommitment && mark === "hidden" && (
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[0.45rem] uppercase tracking-[0.22em] text-[var(--text-faint)]">
                Hold
              </span>
            )}
            {mark === "erased" && (
              <span className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
                <span className="h-0.5 w-8 rotate-[-28deg] rounded-full bg-current opacity-70" />
              </span>
            )}
          </HapticButton>
        );
      })}
    </>
  );
}

type RowFragmentComponent = typeof RowFragmentImpl & {
  ColumnTarget: typeof ColumnTarget;
};

export const RowFragment = RowFragmentImpl as RowFragmentComponent;

RowFragment.ColumnTarget = ColumnTarget;
