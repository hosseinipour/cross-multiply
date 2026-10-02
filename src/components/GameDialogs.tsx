import { CheckCircle2, Heart, Lightbulb, Sparkles, Star, Timer } from "lucide-react";
import {
  getLevelResult,
  MAX_HINT_STOCK,
  type GameStatus,
  type ProgressState,
  type SessionState,
} from "../appState";
import type { DifficultyId, Puzzle } from "../game";
import { DialogShell } from "./DialogShell";
import { formatDuration } from "./formatDuration";
import { HapticButton } from "./HapticButton";
import { ResultStat } from "./ResultStat";
import { primaryActionClass, secondaryActionClass } from "./uiStyles";

function WinTimeLine({ session }: { session: SessionState }) {
  const summary = session.lastWin;

  if (!summary) {
    return null;
  }

  const newBest =
    summary.previousBestMs !== null && summary.timeMs < summary.previousBestMs;
  const note = summary.firstClear
    ? "First clear"
    : newBest
      ? `New best · was ${formatDuration(summary.previousBestMs!)}`
      : summary.previousBestMs !== null
        ? `Best ${formatDuration(summary.previousBestMs)}`
        : null;

  return (
    <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-[var(--text-secondary)]">
      <Timer className="h-3.5 w-3.5 text-[var(--accent-strong)]" strokeWidth={2} />
      <span className="game-number text-sm text-[var(--text-primary)]">
        {formatDuration(summary.timeMs)}
      </span>
      {note && (
        <span
          className={`rounded-full px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-[0.14em] ${
            newBest || summary.firstClear
              ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
              : "bg-[var(--panel-bg)] text-[var(--text-muted)]"
          }`}
        >
          {note}
        </span>
      )}
    </div>
  );
}

export function GameDialogs({
  difficulty,
  hintStock,
  onCloseUnlock,
  onMoveNext,
  onReroll,
  onRetry,
  progress,
  puzzle,
  session,
  status,
  unlockDialogOpen,
}: {
  difficulty: DifficultyId;
  hintStock: number;
  onCloseUnlock: () => void;
  onMoveNext: () => void;
  onReroll: () => void;
  onRetry: () => void;
  progress: ProgressState;
  puzzle: Puzzle;
  session: SessionState;
  status: GameStatus;
  unlockDialogOpen: boolean;
}) {
  const levelResult = getLevelResult(progress, difficulty, puzzle.level);
  const totalCells = puzzle.size * puzzle.size;
  const placedCells = session.marks.flat().filter((mark) => mark !== "hidden").length;

  return (
    <>
      {status === "lost" && (
        <DialogShell
          title="Out of hearts"
          icon={
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--danger)]/35 bg-[color-mix(in_oklch,var(--danger)_16%,transparent)] text-[var(--danger)]">
              <Heart className="h-6 w-6 fill-current" strokeWidth={1.8} />
            </div>
          }
          actions={
            <>
              <HapticButton
                type="button"
                onClick={onRetry}
                className={secondaryActionClass}
              >
                Retry board
              </HapticButton>
              <HapticButton
                type="button"
                onClick={onReroll}
                className={primaryActionClass}
                data-autofocus
              >
                New board
              </HapticButton>
            </>
          }
        >
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            You placed{" "}
            <span className="game-number text-[var(--text-primary)]">
              {placedCells}/{totalCells}
            </span>{" "}
            cells before the hearts ran out. Retry this board with what you learned, or try a new layout for the same level.
          </p>
        </DialogShell>
      )}

      {unlockDialogOpen && (
        <DialogShell
          title="All chapters unlocked"
          icon={
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--lemon)]/50 bg-[color-mix(in_oklch,var(--lemon)_30%,transparent)] text-[var(--text-primary)]">
              <Sparkles className="h-6 w-6" strokeWidth={1.8} />
            </div>
          }
          actions={
            <HapticButton
              type="button"
              onClick={onCloseUnlock}
              className={`sm:col-span-2 ${primaryActionClass}`}
            >
              Choose a chapter
            </HapticButton>
          }
        >
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Medium, Hard, Expert, and Mythic are ready in the chapter rail.
          </p>
        </DialogShell>
      )}

      {status === "won" && (
        <DialogShell
          title="Level cleared"
          size="lg"
          icon={
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--success)]/35 bg-[color-mix(in_oklch,var(--success)_18%,transparent)] text-[var(--success)]">
              <CheckCircle2 className="h-6 w-6" strokeWidth={1.8} />
            </div>
          }
          actions={
            <>
              <HapticButton
                type="button"
                onClick={onRetry}
                className={secondaryActionClass}
              >
                Replay same board
              </HapticButton>
              <HapticButton
                type="button"
                onClick={onMoveNext}
                className={primaryActionClass}
                data-autofocus
              >
                Next level
              </HapticButton>
            </>
          }
        >
          <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
            Your best result for this level now includes these stars and missions.
          </p>
          <WinTimeLine session={session} />

          <div className="mt-6 rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-muted)]/50 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_28px_var(--shadow-soft)]">
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: 3 }, (_, index) => (
                <Star
                  key={index}
                  className={`h-7 w-7 ${
                    index < (levelResult?.stars ?? 0)
                      ? "fill-[var(--lemon)] text-[var(--lemon)] filter drop-shadow-[0_2px_8px_var(--glow-secondary)]"
                      : "text-[var(--panel-border)]"
                  }`}
                  strokeWidth={1.8}
                />
              ))}
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
              <ResultStat label="Hearts" value={`${session.hearts}/${session.maxHearts}`} />
              <ResultStat label="Hints" value={session.hintsUsed} />
              <ResultStat label="Mistakes" value={session.mistakes} />
            </div>
            {hintStock < MAX_HINT_STOCK && (
              <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-bold text-[var(--text-secondary)]">
                <Lightbulb className="h-3.5 w-3.5 text-[var(--accent-pop)]" strokeWidth={2} />
                Next level adds a hint to your stock
              </div>
            )}

            <div className="mt-4 space-y-3">
              {puzzle.missions.map((mission) => {
                const completed =
                  levelResult?.missionsCompleted.includes(mission.id) ?? false;

                return (
                  <div
                    key={mission.id}
                    className={`flex items-center justify-between rounded-[1.25rem] border px-4 py-3.5 spring-transition ${
                      completed
                        ? "border-[var(--success)]/35 bg-[color-mix(in_oklch,var(--success)_10%,transparent)]"
                        : "border-[var(--panel-border)] bg-[var(--panel-bg)] hover:bg-[var(--panel-bg)]/80"
                    }`}
                  >
                    <div className="text-left">
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {mission.title}
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-secondary)] leading-relaxed">
                        {mission.description}
                      </div>
                    </div>
                    {completed ? (
                      <CheckCircle2
                        className="h-5 w-5 text-[var(--success)] shrink-0 ml-2"
                        strokeWidth={1.8}
                      />
                    ) : (
                      <div className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--text-muted)] shrink-0 ml-2">
                        Missed
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </DialogShell>
      )}
    </>
  );
}
