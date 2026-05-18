import { Lock } from "lucide-react";
import {
  isDifficultyAvailable,
  type ProgressState,
} from "../appState";
import {
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  type DifficultyId,
} from "../game";
import { HapticButton } from "./HapticButton";

export function DifficultyRail({
  className = "",
  difficulty,
  onChange,
  progress,
}: {
  className?: string;
  difficulty: DifficultyId;
  onChange: (difficulty: DifficultyId) => void;
  progress: ProgressState;
}) {
  return (
    <div
      className={`min-w-0 snap-x gap-2 overflow-x-auto pb-2 [scrollbar-width:none] sm:gap-3 sm:pb-3 ${className}`}
    >
      {DIFFICULTY_ORDER.map((id) => {
        const active = difficulty === id;
        const unlocked = isDifficultyAvailable(progress, id);
        const label = DIFFICULTIES[id].label;

        return (
          <HapticButton
            key={id}
            type="button"
            onClick={() => onChange(id)}
            disabled={!unlocked}
            aria-pressed={active}
            aria-label={
              unlocked
                ? `${label} chapter, level ${progress[id].highestUnlockedLevel}`
                : `${label} chapter locked`
            }
            className={`w-[7.25rem] shrink-0 snap-start rounded-[1.1rem] border px-3 py-2.5 text-left transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:w-36 sm:rounded-[1.45rem] sm:px-4 sm:py-3 2xl:w-[10rem] ${
              active
                ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[inset_0_-3px_0_color-mix(in_oklch,var(--accent)_28%,transparent),0_8px_18px_var(--shadow-soft)]"
                : "border-[var(--panel-border)] bg-[var(--panel-muted)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_45%,transparent)] hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:bg-[var(--panel-bg)]"
            } ${!unlocked ? "cursor-not-allowed opacity-45" : ""}`}
          >
            <div className="flex min-w-0 items-center gap-2 text-[0.66rem] font-black uppercase tracking-[0.18em] text-[var(--text-muted)] sm:text-xs sm:tracking-[0.24em]">
              {!unlocked && <Lock className="h-3.5 w-3.5 shrink-0" />}
              <span className="min-w-0 truncate">{label}</span>
            </div>
            <div className="game-number mt-1.5 text-base font-black text-[var(--text-primary)] sm:mt-2 sm:text-lg">
              Lv {progress[id].highestUnlockedLevel}
            </div>
            <div className="mt-0.5 text-[0.7rem] text-[var(--text-secondary)] sm:mt-1 sm:text-xs">
              {progress[id].clearedLevels} cleared
            </div>
          </HapticButton>
        );
      })}
    </div>
  );
}
