import type { CellMark, Puzzle } from "../game";
import {
  getPrimeFactors,
  getTargetConcealment,
  getRowProgress,
  getVisibleTarget,
  isCellBlockedByNoEcho,
  isCellBlockedBySpotlight,
  isCellCloaked,
  isCellLocked,
  isCellSealed,
  isRowResolved,
  isProgressHidden,
  isTargetCiphered,
  type TargetAxis,
} from "../game";
import { HapticButton } from "./HapticButton";
import { TargetBadge } from "./TargetBadge";

function ColumnTarget({
  concealment,
  factorChips,
  progressHidden,
  progress,
  resolved,
  target,
}: {
  target: number | null;
  concealment: "blind" | "deepFog" | "fog" | null;
  factorChips?: number[];
  progressHidden?: boolean;
  progress: number;
  resolved: boolean;
}) {
  return (
    <TargetBadge
      target={target}
      concealment={concealment}
      factorChips={factorChips}
      progressHidden={progressHidden}
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
  noEchoLine,
}: {
  row: number;
  puzzle: Puzzle;
  marks: CellMark[][];
  onPress: (row: number, col: number) => void;
  focusKey: string | null;
  activeCommitment: { axis: TargetAxis; index: number } | null;
  noEchoLine: { axis: TargetAxis; index: number } | null;
}) {
  const resolved = isRowResolved(puzzle, marks, row);
  const progress = getRowProgress(puzzle, marks, row);
  const target = getVisibleTarget(puzzle, marks, "row", row);
  const rowCiphered = target !== null && isTargetCiphered(puzzle, marks, "row");

  return (
    <>
      <TargetBadge
        target={target}
        concealment={getTargetConcealment(puzzle, marks, "row", row)}
        factorChips={rowCiphered && target !== null ? getPrimeFactors(target) : undefined}
        progressHidden={isProgressHidden(puzzle, marks, "row", row)}
        progress={progress}
        resolved={resolved}
      />
      {Array.from({ length: puzzle.size }, (_, col) => {
        const mark = marks[row][col];
        const locked = isCellLocked(puzzle, row, col);
        const isPulse = focusKey?.startsWith(`${row}-${col}-`) ?? false;
        const isMiss = focusKey?.startsWith(`${row}-${col}-miss-`) ?? false;
        const sealed = isCellSealed(puzzle, marks, row, col);
        const cloaked = isCellCloaked(puzzle, marks, row, col);
        const blockedBySpotlight = isCellBlockedBySpotlight(puzzle, marks, row, col);
        const blockedByNoEcho = isCellBlockedByNoEcho(noEchoLine, row, col);
        const blockedByCommitment = activeCommitment
          ? activeCommitment.axis === "row"
            ? activeCommitment.index !== row
            : activeCommitment.index !== col
          : false;
        const blocked =
          sealed ||
          cloaked ||
          blockedBySpotlight ||
          blockedByNoEcho ||
          blockedByCommitment;
        const spotlightLine =
          puzzle.spotlightLine?.axis === "row"
            ? puzzle.spotlightLine.index === row
            : puzzle.spotlightLine?.index === col;

        return (
          <HapticButton
            key={`${row}-${col}`}
            type="button"
            onClick={() => onPress(row, col)}
            disabled={mark !== "hidden" || blocked}
            haptic="none"
            className={`group relative aspect-square rounded-[0.9rem] border text-center transition duration-200 disabled:cursor-default sm:rounded-[1.15rem] ${
              mark === "selected"
                ? "border-[var(--cell-highlight-border)] [background:var(--cell-highlight)] text-[var(--cell-highlight-text)] shadow-[0_0_0_2px_rgba(255,255,255,0.15)]"
                : mark === "erased"
                  ? "border-[var(--cell-erased-border)] bg-[var(--cell-erased)] text-[var(--text-faint)]"
                  : blocked
                    ? cloaked
                      ? "border-dashed border-fuchsia-300/35 bg-fuchsia-400/10 text-fuchsia-100 opacity-80"
                      : sealed
                        ? "border-dashed border-cyan-300/35 bg-cyan-400/10 text-cyan-100 opacity-80"
                        : "border-[var(--cell-border)] bg-[var(--panel-muted)]/50 text-[var(--text-faint)] opacity-45"
                    : "border-[var(--cell-border)] bg-[var(--cell-bg)] text-[var(--text-primary)] hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:bg-[var(--cell-hover)]"
            } ${locked ? "shadow-[inset_0_0_0_1px_rgba(250,204,21,0.45)]" : ""} ${
              spotlightLine && !blockedBySpotlight
                ? "ring-2 ring-lime-300/45"
                : ""
            } ${isPulse ? "animate-[pulse_0.45s_ease-out]" : ""}`}
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
              {cloaked ? "?" : puzzle.board[row][col]}
            </span>
            {locked && (
              <span className="absolute left-2 top-2 rounded-full bg-amber-300/20 px-1.5 py-0.5 text-[0.45rem] font-semibold uppercase tracking-[0.2em] text-amber-100">
                Lock
              </span>
            )}
            {isMiss && (
              <span className="pointer-events-none absolute inset-0 rounded-[0.85rem] bg-rose-500/28 opacity-0 ring-2 ring-rose-300/70 [animation:wrongFlash_500ms_ease-out_forwards] sm:rounded-[1.1rem]" />
            )}
            {sealed && mark === "hidden" && (
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[0.45rem] uppercase tracking-[0.22em] text-cyan-100/70">
                Seal
              </span>
            )}
            {cloaked && mark === "hidden" && (
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[0.45rem] uppercase tracking-[0.22em] text-fuchsia-100/70">
                Cloak
              </span>
            )}
            {blockedBySpotlight && mark === "hidden" && (
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[0.45rem] uppercase tracking-[0.22em] text-[var(--text-faint)]">
                Spot
              </span>
            )}
            {blockedByNoEcho && mark === "hidden" && (
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[0.45rem] uppercase tracking-[0.22em] text-[var(--text-faint)]">
                Echo
              </span>
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
