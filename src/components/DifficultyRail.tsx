import { useRef, useEffect } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        el.scrollBy({
          left: e.deltaY,
          behavior: "auto",
        });
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <div
      ref={containerRef}
      className={`min-w-0 snap-x gap-3 overflow-x-auto py-3 px-1.5 [scrollbar-width:none] sm:gap-4 sm:py-4 sm:px-2.5 -my-3 -mx-1.5 sm:-my-4 sm:-mx-2.5 ${className}`}
    >
      {DIFFICULTY_ORDER.map((id) => {
        const active = difficulty === id;
        const unlocked = isDifficultyAvailable(progress, id);
        const label = DIFFICULTIES[id].label;
        const cleared = progress[id].clearedLevels;

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
            className={`spotlight-slab w-[8.25rem] shrink-0 snap-start rounded-[1.25rem] border p-3 text-left spring-transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:w-[9.5rem] sm:rounded-[1.5rem] sm:p-4 2xl:w-[11.5rem] ${
              active
                ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[inset_0_-3px_0_color-mix(in_oklch,var(--accent)_28%,transparent),0_12px_24px_var(--glow-primary)] scale-[1.02]"
                : "border-[var(--panel-border)] bg-[var(--panel-muted)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_45%,transparent)] hover:-translate-y-1 hover:border-[var(--accent)]/40 hover:bg-[var(--panel-bg)]"
            } ${!unlocked ? "cursor-not-allowed opacity-40" : ""}`}
          >
            <div className="flex min-w-0 items-center justify-between gap-1.5 text-[0.66rem] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] sm:text-[0.72rem] sm:tracking-[0.24em]">
              <span className="min-w-0 truncate">{label}</span>
              {!unlocked && <Lock className="h-3 w-3 shrink-0 opacity-70" />}
            </div>

            <div className="game-number mt-2 text-lg font-black text-[var(--text-primary)] sm:mt-2.5 sm:text-xl">
              Lv {progress[id].highestUnlockedLevel}
            </div>

            <div className="mt-1 flex items-center justify-between text-[0.68rem] text-[var(--text-secondary)] sm:text-xs">
              <span>{cleared} cleared</span>
            </div>

            {/* Micro Progress Indicator */}
            {unlocked && (
              <div className="mt-2.5 h-1 w-full rounded-full bg-[var(--panel-border)] overflow-hidden">
                <div
                  className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (cleared / 10) * 100)}%` }}
                />
              </div>
            )}
          </HapticButton>
        );
      })}
    </div>
  );
}
