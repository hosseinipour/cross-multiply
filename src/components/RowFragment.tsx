import { useRef } from "react";
import type { CellMark, DelayedCell, Puzzle } from "../game";
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
import { vibrateOnButtonPress } from "./haptics";
import { TargetBadge } from "./TargetBadge";

const LONG_PRESS_MS = 420;

export type CellPressHandler = (row: number, col: number, alternate?: boolean) => void;

function ColumnTarget({
  col,
  concealment,
  factorChips,
  highlighted,
  progressHidden,
  progress,
  resolved,
  target,
}: {
  col?: number;
  target: number | null;
  concealment: "blind" | "deepFog" | "fog" | null;
  factorChips?: number[];
  highlighted?: boolean;
  progressHidden?: boolean;
  progress: number;
  resolved: boolean;
}) {
  return (
    <TargetBadge
      axis="column"
      index={col}
      target={target}
      concealment={concealment}
      factorChips={factorChips}
      highlighted={highlighted}
      progressHidden={progressHidden}
      progress={progress}
      resolved={resolved}
    />
  );
}

type CellBlock = "seal" | "cloak" | "spot" | "echo" | "hold" | null;

const blockLabels: Record<Exclude<CellBlock, null>, { label: string; reason: string }> = {
  seal: { label: "Seal", reason: "sealed until more correct marks" },
  cloak: { label: "Cloak", reason: "cloaked until more correct marks" },
  spot: { label: "Spot", reason: "finish the spotlight line first" },
  echo: { label: "Echo", reason: "mark a different line next" },
  hold: { label: "Hold", reason: "stay on your committed line" },
};

function describeCell(
  row: number,
  col: number,
  value: number | null,
  mark: CellMark,
  locked: boolean,
  block: CellBlock,
) {
  const position = `Row ${row + 1}, column ${col + 1}`;
  const shown = value === null ? "hidden value" : String(value);
  const state =
    mark === "selected"
      ? "selected"
      : mark === "erased"
        ? "erased"
        : block
          ? blockLabels[block].reason
          : "open";

  return `${position}: ${shown}, ${state}${locked ? ", prefilled" : ""}`;
}

function BoardCell({
  row,
  col,
  value,
  mark,
  locked,
  block,
  inCrosshair,
  spotlit,
  pulse,
  miss,
  hinted,
  sweepDelay,
  onPress,
  onHover,
}: {
  row: number;
  col: number;
  value: number;
  mark: CellMark;
  locked: boolean;
  block: CellBlock;
  inCrosshair: boolean;
  spotlit: boolean;
  pulse: boolean;
  miss: boolean;
  hinted: boolean;
  sweepDelay: number | null;
  onPress: CellPressHandler;
  onHover?: (cell: { row: number; col: number } | null) => void;
}) {
  const pressTimer = useRef<number | null>(null);
  const longPressFired = useRef(false);
  const lastPointerType = useRef<string>("mouse");
  const disabled = mark !== "hidden" || block !== null;
  const cloaked = block === "cloak";
  const sealed = block === "seal";

  const clearTimer = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };

  return (
    <button
      type="button"
      data-cell={`${row}-${col}`}
      aria-label={describeCell(row, col, cloaked ? null : value, mark, locked, block)}
      onClick={(event) => {
        const fromLongPress = longPressFired.current;
        longPressFired.current = false;

        // Swallow the click that trails a long-press, but never a keyboard press.
        if (fromLongPress && event.detail !== 0) {
          return;
        }

        onPress(row, col);
      }}
      onContextMenu={(event) => {
        event.preventDefault();

        // Touch long-presses are handled by the timer below.
        if (!disabled && lastPointerType.current === "mouse") {
          onPress(row, col, true);
        }
      }}
      onPointerDown={(event) => {
        lastPointerType.current = event.pointerType;
        longPressFired.current = false;

        if (disabled || event.pointerType === "mouse") {
          return;
        }

        clearTimer();
        pressTimer.current = window.setTimeout(() => {
          pressTimer.current = null;
          longPressFired.current = true;
          vibrateOnButtonPress();
          onPress(row, col, true);
        }, LONG_PRESS_MS);
      }}
      onPointerUp={clearTimer}
      onPointerCancel={clearTimer}
      onPointerLeave={clearTimer}
      onPointerEnter={(event) => {
        // A tap leaves a sticky "hover" on touch screens, so only mice drive the crosshair.
        if (event.pointerType === "mouse") {
          onHover?.({ row, col });
        }
      }}
      onFocus={(event) => {
        if (event.currentTarget.matches(":focus-visible")) {
          onHover?.({ row, col });
        }
      }}
      disabled={disabled}
      className={`group game-number relative aspect-square rounded-[1rem] border text-center spring-transition [-webkit-touch-callout:none] disabled:cursor-default focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)] sm:rounded-[1.25rem] ${
        mark === "selected"
          ? "border-[var(--cell-highlight-border)] [background:var(--cell-highlight)] text-[var(--cell-highlight-text)] shadow-[inset_0_-4px_0_color-mix(in_oklch,var(--accent-strong)_45%,transparent),0_12px_22px_var(--glow-primary)] [animation:goodPop_240ms_cubic-bezier(0.34,1.56,0.64,1)] scale-[1.04]"
          : mark === "erased"
            ? "border-[var(--cell-erased-border)] bg-[var(--cell-erased)] text-[var(--text-faint)] shadow-[inset_0_3px_0_color-mix(in_oklch,var(--bg)_40%,transparent)] scale-[0.98] opacity-80"
            : block
              ? cloaked
                ? "border-dashed border-[var(--berry)]/45 bg-[color-mix(in_oklch,var(--berry)_12%,transparent)] text-[var(--berry)] opacity-70"
                : sealed
                  ? "border-dashed border-[var(--sky)]/45 bg-[color-mix(in_oklch,var(--sky)_12%,transparent)] text-[var(--sky)] opacity-70"
                  : "border-[var(--cell-border)] bg-[var(--panel-muted)]/40 text-[var(--text-faint)] opacity-40 scale-[0.96]"
              : `border-[var(--cell-border)] text-[var(--text-primary)] shadow-[inset_0_-4px_0_color-mix(in_oklch,var(--cell-border)_45%,transparent),0_8px_16px_var(--shadow-soft)] hover:-translate-y-1 hover:border-[var(--accent)]/70 hover:bg-[var(--cell-hover)] hover:shadow-[inset_0_-4px_0_color-mix(in_oklch,var(--cell-border)_45%,transparent),0_12px_20px_var(--shadow-board)] active:translate-y-0 active:shadow-[inset_0_3px_0_color-mix(in_oklch,var(--cell-border)_40%,transparent)] ${
                  inCrosshair ? "bg-[var(--cell-hover)]" : "bg-[var(--cell-bg)]"
                }`
      } ${locked ? "ring-2 ring-[var(--lemon)]/60" : ""} ${
        spotlit ? "outline outline-2 outline-offset-2 outline-[var(--lemon)]" : ""
      } ${
        miss
          ? "[animation:shake_340ms_ease-in-out]"
          : pulse
            ? "animate-[pulse_0.45s_ease-out]"
            : ""
      }`}
      style={
        sweepDelay !== null
          ? { animation: `sweepClear 520ms ease-out ${sweepDelay}ms both` }
          : undefined
      }
    >
      <span
        className={`absolute inset-0 rounded-[0.95rem] sm:rounded-[1.2rem] ${
          mark === "selected" ? "ring-2 ring-[var(--cell-highlight-ring)]" : "ring-0"
        }`}
      />
      <span
        className={`relative z-10 flex h-full items-center justify-center text-[clamp(1.1rem,2.8vw,2.2rem)] font-black sm:text-[clamp(1.3rem,3.2vw,2.2rem)] tracking-tight ${
          mark === "erased" ? "opacity-30" : ""
        }`}
      >
        {cloaked ? "?" : value}
      </span>
      {locked && (
        <span className="absolute left-1.5 top-1.5 rounded-md bg-[var(--lemon)] px-1 py-0.5 text-[0.42rem] font-black uppercase tracking-[0.2em] text-[var(--fg)] shadow-[0_2px_6px_var(--shadow-soft)]">
          Lock
        </span>
      )}
      {hinted && (
        <span className="pointer-events-none absolute -inset-1 rounded-[1.15rem] ring-[3px] ring-[var(--lemon)] [animation:hintGlow_1.8s_ease-out_forwards] sm:rounded-[1.45rem]" />
      )}
      {miss && (
        <span className="pointer-events-none absolute inset-0 rounded-[0.95rem] bg-[var(--danger)]/28 opacity-0 ring-2 ring-[var(--danger)]/75 [animation:wrongFlash_500ms_ease-out_forwards] sm:rounded-[1.2rem]" />
      )}
      {block && mark === "hidden" && (
        <span
          className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[0.42rem] font-black uppercase tracking-[0.24em] ${
            cloaked
              ? "text-[var(--berry)]/90"
              : sealed
                ? "text-[var(--sky)]/90"
                : "text-[var(--text-faint)]"
          }`}
        >
          {blockLabels[block].label}
        </span>
      )}
      {mark === "erased" && (
        <span className="absolute inset-0 flex items-center justify-center text-[var(--text-faint)] pointer-events-none">
          <span className="h-[2px] w-[50%] rotate-[-30deg] rounded-full bg-current opacity-60" />
        </span>
      )}
    </button>
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
  autoCleared = [],
  hoverCell = null,
  onHover,
}: {
  row: number;
  puzzle: Puzzle;
  marks: CellMark[][];
  onPress: CellPressHandler;
  focusKey: string | null;
  activeCommitment: { axis: TargetAxis; index: number } | null;
  noEchoLine: { axis: TargetAxis; index: number } | null;
  autoCleared?: DelayedCell[];
  hoverCell?: { row: number; col: number } | null;
  onHover?: (cell: { row: number; col: number } | null) => void;
}) {
  const resolved = isRowResolved(puzzle, marks, row);
  const progress = getRowProgress(puzzle, marks, row);
  const target = getVisibleTarget(puzzle, marks, "row", row);
  const rowCiphered = target !== null && isTargetCiphered(puzzle, marks, "row");

  return (
    <>
      <TargetBadge
        axis="row"
        index={row}
        target={target}
        concealment={getTargetConcealment(puzzle, marks, "row", row)}
        factorChips={rowCiphered && target !== null ? getPrimeFactors(target) : undefined}
        highlighted={hoverCell?.row === row}
        progressHidden={isProgressHidden(puzzle, marks, "row", row)}
        progress={progress}
        resolved={resolved}
      />
      {Array.from({ length: puzzle.size }, (_, col) => {
        const mark = marks[row][col];
        const blockedByCommitment = activeCommitment
          ? activeCommitment.axis === "row"
            ? activeCommitment.index !== row
            : activeCommitment.index !== col
          : false;
        const blockedBySpotlight = isCellBlockedBySpotlight(puzzle, marks, row, col);
        const block: CellBlock = isCellSealed(puzzle, marks, row, col)
          ? "seal"
          : isCellCloaked(puzzle, marks, row, col)
            ? "cloak"
            : blockedBySpotlight
              ? "spot"
              : isCellBlockedByNoEcho(noEchoLine, row, col)
                ? "echo"
                : blockedByCommitment
                  ? "hold"
                  : null;
        const spotlightLine =
          puzzle.spotlightLine?.axis === "row"
            ? puzzle.spotlightLine.index === row
            : puzzle.spotlightLine?.index === col;
        const sweepIndex = autoCleared.findIndex(
          (cell) => cell.row === row && cell.col === col,
        );

        return (
          <BoardCell
            key={`${row}-${col}`}
            row={row}
            col={col}
            value={puzzle.board[row][col]}
            mark={mark}
            locked={isCellLocked(puzzle, row, col)}
            block={block}
            inCrosshair={
              hoverCell !== null &&
              (hoverCell.row === row || hoverCell.col === col) &&
              !(hoverCell.row === row && hoverCell.col === col)
            }
            spotlit={spotlightLine && !blockedBySpotlight}
            pulse={focusKey?.startsWith(`${row}-${col}-`) ?? false}
            miss={focusKey?.startsWith(`${row}-${col}-miss-`) ?? false}
            hinted={focusKey?.startsWith(`${row}-${col}-hint-`) ?? false}
            sweepDelay={sweepIndex >= 0 ? 80 + sweepIndex * 45 : null}
            onPress={onPress}
            onHover={onHover}
          />
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
