import { CheckCircle2, Heart, Sparkles, Star } from "lucide-react";
import {
  getLevelResult,
  type GameStatus,
  type ProgressState,
  type SessionState,
} from "../appState";
import type { DifficultyId, Puzzle } from "../game";
import { DialogShell } from "./DialogShell";
import { HapticButton } from "./HapticButton";
import { ResultStat } from "./ResultStat";
import { primaryActionClass, secondaryActionClass } from "./uiStyles";

export function GameDialogs({
  difficulty,
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
              >
                New board
              </HapticButton>
            </>
          }
        >
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            You used every heart. Retry this board, or start a new layout for the same level.
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
              >
                Next level
              </HapticButton>
            </>
          }
        >
          <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
            Your best result for this level now includes these stars and missions.
          </p>

          <div className="mt-6 rounded-[1.5rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] p-5 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--surface)_55%,transparent)]">
            <div className="flex items-center justify-center gap-2">
              {Array.from({ length: 3 }, (_, index) => (
                <Star
                  key={index}
                  className={`h-7 w-7 ${
                    index < (levelResult?.stars ?? 0)
                      ? "fill-[var(--lemon)] text-[var(--lemon)]"
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

            <div className="mt-4 space-y-3">
              {puzzle.missions.map((mission) => {
                const completed =
                  levelResult?.missionsCompleted.includes(mission.id) ?? false;

                return (
                  <div
                    key={mission.id}
                    className={`flex items-center justify-between rounded-[1.1rem] border px-4 py-3 ${
                      completed
                        ? "border-[var(--success)]/35 bg-[color-mix(in_oklch,var(--success)_16%,transparent)]"
                        : "border-[var(--panel-border)] bg-[var(--panel-bg)]"
                    }`}
                  >
                    <div>
                      <div className="text-sm font-semibold text-[var(--text-primary)]">
                        {mission.title}
                      </div>
                      <div className="mt-1 text-sm text-[var(--text-secondary)]">
                        {mission.description}
                      </div>
                    </div>
                    {completed ? (
                      <CheckCircle2
                        className="h-5 w-5 text-[var(--success)]"
                        strokeWidth={1.8}
                      />
                    ) : (
                      <div className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">
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
