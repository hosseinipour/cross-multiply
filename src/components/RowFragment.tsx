import type { CellMark, Puzzle } from "../game";
import { getRowProgress, isRowResolved } from "../game";
import { HapticButton } from "./HapticButton";
import { TargetBadge } from "./TargetBadge";

export function RowFragment({
  row,
  puzzle,
  marks,
  onPress,
  focusKey,
}: {
  row: number;
  puzzle: Puzzle;
  marks: CellMark[][];
  onPress: (row: number, col: number) => void;
  focusKey: string | null;
}) {
  const resolved = isRowResolved(puzzle, marks, row);
  const progress = getRowProgress(puzzle, marks, row);

  return (
    <>
      <TargetBadge
        target={puzzle.rowTargets[row]}
        progress={progress}
        resolved={resolved}
        axis="row"
      />
      {Array.from({ length: puzzle.size }, (_, col) => {
        const mark = marks[row][col];
        const isPulse = focusKey?.startsWith(`${row}-${col}-`) ?? false;
        const isMiss = focusKey?.startsWith(`${row}-${col}-miss-`) ?? false;

        return (
          <HapticButton
            key={`${row}-${col}`}
            type="button"
            onClick={() => onPress(row, col)}
            haptic="none"
            className={`group relative aspect-square rounded-[0.9rem] border text-center transition duration-200 sm:rounded-[1.15rem] ${
              mark === "selected"
                ? "border-[var(--cell-highlight-border)] [background:var(--cell-highlight)] text-[var(--cell-highlight-text)] shadow-[0_0_0_2px_rgba(255,255,255,0.15)]"
                : mark === "erased"
                  ? "border-[var(--cell-erased-border)] bg-[var(--cell-erased)] text-[var(--text-faint)]"
                  : "border-[var(--cell-border)] bg-[var(--cell-bg)] text-[var(--text-primary)] hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:bg-[var(--cell-hover)]"
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
              {puzzle.board[row][col]}
            </span>
            {isMiss && (
              <span className="pointer-events-none absolute inset-0 rounded-[0.85rem] bg-rose-500/28 opacity-0 ring-2 ring-rose-300/70 [animation:wrongFlash_500ms_ease-out_forwards] sm:rounded-[1.1rem]" />
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
