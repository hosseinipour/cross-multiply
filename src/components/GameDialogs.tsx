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
