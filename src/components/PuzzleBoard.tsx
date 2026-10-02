import { useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { Lightbulb, Lock, ShieldAlert, Sparkles } from "lucide-react";
import type { ProgressState, SessionState } from "../appState";
import {
  countMatchedTargetsOnAxis,
  getColProgress,
  getCorrectMarkCount,
  getDelayedCellProgress,
  getFactorCipherProgress,
  getPrimeFactors,
  getSpotlightProgress,
  getTargetConcealment,
  getVisibleTarget,
  isColResolved,
  isHintGateUnlocked,
  isProgressHidden,
  isTargetCiphered,
  type DifficultyId,
  type ToolMode,
} from "../game";
import { Hearts } from "./Hearts";
import { RowFragment, type CellPressHandler } from "./RowFragment";
import { FirstRunCoach, type FirstRunStage } from "./FirstRunCoach";
import { StatusPill, type StatusPillTone } from "./StatusPill";

type BoardStatusPill = {
  key: string;
  icon: ReactNode;
  label: ReactNode;
  rank?: number;
  tone?: StatusPillTone;
};

function getBoardStatusPills(session: SessionState): BoardStatusPill[] {
  const { puzzle } = session;
  const correctMarks = getCorrectMarkCount(puzzle, session.marks);
  const sealedProgress = getDelayedCellProgress(
    puzzle,
    session.marks,
    puzzle.sealedCells,
  );
  const cloakedProgress = getDelayedCellProgress(
    puzzle,
    session.marks,
    puzzle.cloakedCells,
  );
  const spotlightProgress = getSpotlightProgress(puzzle, session.marks);
  const factorCipherProgress = getFactorCipherProgress(puzzle, session.marks);
  const hintGateUnlocked = isHintGateUnlocked(puzzle, session.marks);
  const pills: BoardStatusPill[] = [];

  if (session.noEchoLine) {
    pills.push({
      key: "no-echo",
      icon: <ShieldAlert className="h-3.5 w-3.5" />,
      label: (
        <>
          Next mark outside {session.noEchoLine.axis} {session.noEchoLine.index + 1}
        </>
      ),
      rank: 95,
      tone: "danger",
    });
  }

  if (session.activeCommitment) {
    pills.push({
      key: "commitment",
      icon: <Lock className="h-3.5 w-3.5" />,
      label: (
        <>
          Stay on {session.activeCommitment.axis} {session.activeCommitment.index + 1}
        </>
      ),
      rank: 92,
      tone: "sky",
    });
  }

  if (session.toolLocked) {
    pills.push({
      key: "tool-lock",
      icon: <ShieldAlert className="h-3.5 w-3.5" />,
      label: <>Erase unlocks after one visible target match</>,
      rank: 90,
      tone: "lemon",
    });
  }

  if (puzzle.hintGate && !hintGateUnlocked) {
    pills.push({
      key: "hint-gate",
      icon: <Lightbulb className="h-3.5 w-3.5" />,
      label: (
        <>
          Hints unlock {correctMarks}/{puzzle.hintGate.unlockAfterCorrectMarks}
        </>
      ),
      rank: 88,
      tone: "lemon",
    });
  }

  if (spotlightProgress && !spotlightProgress.complete) {
    pills.push({
      key: "spotlight",
      icon: <Sparkles className="h-3.5 w-3.5" />,
      label: (
        <>
          Stay on {spotlightProgress.axis} {spotlightProgress.index + 1}:{" "}
          {spotlightProgress.current}/{spotlightProgress.required}
        </>
      ),
      rank: 86,
      tone: "lemon",
    });
  }

  if (sealedProgress && !sealedProgress.unlocked) {
    pills.push({
      key: "seals",
      icon: <Lock className="h-3.5 w-3.5" />,
      label: (
        <>
          Sealed cells {sealedProgress.current}/{sealedProgress.required}
        </>
      ),
      rank: 70,
      tone: "sky",
    });
  }

  if (cloakedProgress && !cloakedProgress.unlocked) {
    pills.push({
      key: "cloaks",
      icon: <Sparkles className="h-3.5 w-3.5" />,
      label: (
        <>
          Cloaked cells {cloakedProgress.current}/{cloakedProgress.required}
        </>
      ),
      rank: 68,
      tone: "berry",
    });
  }

  if (puzzle.crossBlind) {
    pills.push({
      key: "cross-blind",
      icon: <Sparkles className="h-3.5 w-3.5" />,
      label: (
        <>
          {puzzle.crossBlind.hiddenAxis === "row" ? "Rows hidden" : "Columns hidden"}:{" "}
          {countMatchedTargetsOnAxis(
            puzzle,
            session.marks,
            puzzle.crossBlind.hiddenAxis === "row" ? "column" : "row",
          )}
          /{puzzle.crossBlind.unlockAfterMatchedVisibleLines}
        </>
      ),
      rank: 66,
      tone: "berry",
    });
  }

  if (factorCipherProgress && !factorCipherProgress.unlocked) {
    pills.push({
      key: "factor-cipher",
      icon: <Sparkles className="h-3.5 w-3.5" />,
      label: (
        <>
          Factors reveal {factorCipherProgress.current}/{factorCipherProgress.required}
        </>
      ),
      rank: 64,
      tone: "accent",
    });
  }

  return pills;
}

const ARROW_STEPS: Record<string, [number, number]> = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
};

function BoardProgress({ placed, total }: { placed: number; total: number }) {
  const percent = total > 0 ? Math.round((placed / total) * 100) : 0;

  return (
    <div
      role="progressbar"
      aria-label="Board progress"
      aria-valuemin={0}
      aria-valuemax={total}
      aria-valuenow={placed}
      className="inline-flex min-h-8 shrink-0 items-center gap-2.5 rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 py-1.5 shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_35%,transparent)]"
    >
      <span className="h-1.5 w-14 overflow-hidden rounded-full bg-[var(--panel-border)] sm:w-20">
        <span
          className="block h-full rounded-full bg-[var(--accent)] transition-[width] duration-500 ease-out"
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="game-number text-xs text-[var(--text-secondary)]">
        {placed}/{total}
      </span>
    </div>
  );
}

export function PuzzleBoard({
  difficulty,
  onCellPress,
  onDismissOnboarding,
  onboardingDismissed,
  progress,
  session,
}: {
  difficulty: DifficultyId;
  onCellPress: (row: number, col: number, tool?: ToolMode) => void;
  onDismissOnboarding: () => void;
  onboardingDismissed: boolean;
  progress: ProgressState;
  session: SessionState;
}) {
  const { puzzle } = session;
  const [hoverCell, setHoverCell] = useState<{ row: number; col: number } | null>(null);
  const placedCells = session.marks.flat().filter((mark) => mark !== "hidden").length;
  const handlePress: CellPressHandler = (row, col, alternate) => {
    onCellPress(
      row,
      col,
      alternate ? (session.mode === "select" ? "erase" : "select") : undefined,
    );
  };
  const handleBoardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = ARROW_STEPS[event.key];
    const origin = (event.target as HTMLElement).closest<HTMLElement>("[data-cell]");

    if (!origin) {
      return;
    }

    if (event.key === "x" || event.key === "X") {
      // Mark with the other tool, mirroring right-click / long-press.
      const [row, col] = origin.dataset.cell!.split("-").map(Number);
      event.preventDefault();
      event.stopPropagation();
      handlePress(row, col, true);
      return;
    }

    if (!step) {
      return;
    }

    event.preventDefault();
    let [row, col] = origin.dataset.cell!.split("-").map(Number);

    // Skip over cells that cannot take a mark right now.
    for (let moves = 0; moves < puzzle.size; moves += 1) {
      row += step[0];
      col += step[1];

      if (row < 0 || col < 0 || row >= puzzle.size || col >= puzzle.size) {
        return;
      }

      const next = event.currentTarget.querySelector<HTMLButtonElement>(
        `[data-cell="${row}-${col}"]`,
      );

      if (next && !next.disabled) {
        next.focus();
        return;
      }
    }
  };
  const boardColumnCount = puzzle.size + 1;
  const boardStyle = {
    // Leave room for the gaps between cells so wide boards fit without scrolling.
    "--board-cell-size": `clamp(2.65rem, calc((100cqw - 1rem - var(--board-gap) * ${boardColumnCount - 1}) / ${boardColumnCount}), min(17cqw, 4.6rem))`,
    "--board-gap": "clamp(0.3rem, 1.1cqw, 0.65rem)",
    gap: "var(--board-gap)",
    gridAutoRows: "var(--board-cell-size)",
    gridTemplateColumns: `repeat(${boardColumnCount}, var(--board-cell-size))`,
    gridTemplateRows: `repeat(${boardColumnCount}, var(--board-cell-size))`,
  } as CSSProperties;
  const correctMarks = getCorrectMarkCount(puzzle, session.marks);
  const showFirstRunCoach =
    !onboardingDismissed &&
    difficulty === "easy" &&
    puzzle.level === 1 &&
    progress.easy.clearedLevels === 0 &&
    session.status === "playing";

  const firstRunStage: FirstRunStage =
    correctMarks === 0 ? "firstMark" : correctMarks < 3 ? "firstLine" : "rhythm";
  const boardStatusPills = getBoardStatusPills(session);
  const visibleBoardStatusPills = [...boardStatusPills]
    .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
    .slice(0, 3);
  const tuckedBoardStatusCount =
    boardStatusPills.length - visibleBoardStatusPills.length;

  return (
    <div className="spotlight-slab w-full max-w-[calc(100vw-1.25rem)] min-w-0 overflow-hidden rounded-[2rem] border border-[var(--panel-border)] bg-[var(--board-shell)] p-3 shadow-[0_24px_60px_var(--shadow-board)] backdrop-blur-md sm:max-w-none sm:p-5 lg:p-6 transition-all duration-300">
      <div className="mb-3 flex min-w-0 flex-nowrap items-center gap-2.5 overflow-x-auto pb-1 [scrollbar-width:none] sm:mb-5 sm:flex-wrap sm:gap-3.5 sm:overflow-visible sm:pb-0">
        <Hearts hearts={session.hearts} maxHearts={session.maxHearts} />
        <BoardProgress placed={placedCells} total={puzzle.size * puzzle.size} />
        {visibleBoardStatusPills.map((pill) => (
          <StatusPill key={pill.key} icon={pill.icon} tone={pill.tone}>
            {pill.label}
          </StatusPill>
        ))}
        {tuckedBoardStatusCount > 0 && (
          <StatusPill
            icon={
              <span className="game-number text-[0.7rem] font-black">
                +{tuckedBoardStatusCount}
              </span>
            }
          >
            More active
          </StatusPill>
        )}
      </div>

      {showFirstRunCoach && (
        <FirstRunCoach
          stage={firstRunStage}
          onDismiss={onDismissOnboarding}
        />
      )}

      <div className="mx-auto min-w-0 max-w-full overflow-x-auto overscroll-x-contain pb-2 custom-scrollbar [container-type:inline-size]">
        <div
          className="mx-auto grid w-max select-none"
          style={boardStyle}
          onKeyDown={handleBoardKeyDown}
          onPointerLeave={() => setHoverCell(null)}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setHoverCell(null);
            }
          }}
        >
          <div className="rounded-[1.1rem] border border-dashed border-[var(--panel-border)] bg-[var(--panel-muted)]/50 sm:rounded-[1.25rem] transition duration-200" />

          {puzzle.colTargets.map((_, col) => {
            const resolved = isColResolved(puzzle, session.marks, col);
            const progressValue = getColProgress(puzzle, session.marks, col);
            const target = getVisibleTarget(
              puzzle,
              session.marks,
              "column",
              col,
            );
            const ciphered =
              target !== null && isTargetCiphered(puzzle, session.marks, "column");

            return (
              <RowFragment.ColumnTarget
                key={`col-${col}`}
                col={col}
                highlighted={hoverCell?.col === col}
                target={target}
                concealment={getTargetConcealment(
                  puzzle,
                  session.marks,
                  "column",
                  col,
                )}
                factorChips={
                  ciphered && target !== null ? getPrimeFactors(target) : undefined
                }
                progressHidden={isProgressHidden(
                  puzzle,
                  session.marks,
                  "column",
                  col,
                )}
                progress={progressValue}
                resolved={resolved}
              />
            );
          })}

          {Array.from({ length: puzzle.size }, (_, row) => (
            <RowFragment
              key={`row-${row}`}
              row={row}
              puzzle={puzzle}
              marks={session.marks}
              focusKey={session.focusKey}
              activeCommitment={session.activeCommitment}
              noEchoLine={session.noEchoLine}
              autoCleared={session.autoCleared}
              hoverCell={hoverCell}
              onHover={setHoverCell}
              onPress={handlePress}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
