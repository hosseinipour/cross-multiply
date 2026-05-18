import type { CSSProperties, ReactNode } from "react";
import { CheckCircle2, Lightbulb, Lock, ShieldAlert, Sparkles } from "lucide-react";
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
} from "../game";
import { Hearts } from "./Hearts";
import { RowFragment } from "./RowFragment";
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
  const pills: BoardStatusPill[] = [
    {
      key: "correct",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: <>Correct marks {correctMarks}</>,
      rank: 100,
    },
  ];

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

export function PuzzleBoard({
  difficulty,
  onCellPress,
  onDismissOnboarding,
  onboardingDismissed,
  progress,
  session,
}: {
  difficulty: DifficultyId;
  onCellPress: (row: number, col: number) => void;
  onDismissOnboarding: () => void;
  onboardingDismissed: boolean;
  progress: ProgressState;
  session: SessionState;
}) {
  const { puzzle } = session;
  const boardColumnCount = puzzle.size + 1;
  const boardStyle = {
    "--board-cell-size": `clamp(2.65rem, calc((100cqw - 1.5rem) / ${boardColumnCount}), min(17cqw, 4.6rem))`,
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
    <div className="w-full max-w-[calc(100vw-1.25rem)] min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--panel-border)] bg-[var(--board-shell)] p-2 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--surface)_55%,transparent),0_20px_44px_var(--shadow-board)] sm:max-w-none sm:rounded-[1.75rem] sm:p-4 lg:p-5">
      <div className="mb-2 flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:mb-4 sm:flex-wrap sm:gap-3 sm:overflow-visible sm:pb-0">
        <Hearts hearts={session.hearts} maxHearts={session.maxHearts} />
        {visibleBoardStatusPills.map((pill) => (
          <StatusPill key={pill.key} icon={pill.icon} tone={pill.tone}>
            {pill.label}
          </StatusPill>
        ))}
        {tuckedBoardStatusCount > 0 && (
          <StatusPill
            icon={
              <span className="game-number text-[0.7rem]">
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

      <div className="mx-auto min-w-0 max-w-full overflow-x-auto overscroll-x-contain pb-2 [container-type:inline-size] [scrollbar-width:thin]">
        <div className="mx-auto grid w-max" style={boardStyle}>
          <div className="rounded-[1rem] border border-dashed border-[var(--panel-border)] bg-[var(--panel-muted)]/60 sm:rounded-[1.15rem]" />

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
              onPress={onCellPress}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
