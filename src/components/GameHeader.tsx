import { Lightbulb, Lock, Moon, RefreshCw, Star, Sun } from "lucide-react";
import type { LevelResult, ThemeMode } from "../appState";
import { DIFFICULTIES, type DifficultyId, type Puzzle } from "../game";
import { DifficultyRail } from "./DifficultyRail";
import { IconActionButton } from "./IconActionButton";

export function GameHeader({
  currentResult,
  difficulty,
  hintGateUnlocked,
  hintStock,
  onChangeDifficulty,
  onReroll,
  onToggleTheme,
  onUseHint,
  progress,
  puzzle,
  sessionStatus,
  theme,
}: {
  currentResult: LevelResult | null;
  difficulty: DifficultyId;
  hintGateUnlocked: boolean;
  hintStock: number;
  onChangeDifficulty: (difficulty: DifficultyId) => void;
  onReroll: () => void;
  onToggleTheme: () => void;
  onUseHint: () => void;
  progress: Parameters<typeof DifficultyRail>[0]["progress"];
  puzzle: Puzzle;
  sessionStatus: "playing" | "won" | "lost";
  theme: ThemeMode;
}) {
  const difficultyConfig = DIFFICULTIES[difficulty];

  return (
    <>
      <div className="flex min-w-0 flex-col items-start gap-3 sm:flex-row sm:justify-between sm:items-center sm:gap-4 border-b border-[var(--panel-border)] pb-4">
        <div className="min-w-0 max-w-full">
          <p className="truncate text-xs font-black uppercase tracking-[0.32em] text-[var(--accent-strong)]">
            Cross Multiply
          </p>
          <div className="mt-1.5 flex items-center gap-2 sm:hidden">
            <span className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              {difficultyConfig.label}
            </span>
            <span className="truncate rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[var(--accent-strong)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--accent)_20%,transparent)]">
              {puzzle.bandLabel}
            </span>
          </div>
          <div className="mt-2 hidden flex-wrap items-center gap-3 sm:flex">
            <span className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">
              {puzzle.chapter}
            </span>
            <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[0.72rem] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--accent)_20%,transparent)]">
              {puzzle.bandLabel}
            </span>
          </div>
        </div>

        <div className="flex max-w-full items-center justify-start gap-1.5 sm:justify-end sm:gap-2">
          <IconActionButton
            type="button"
            onClick={onUseHint}
            disabled={hintStock <= 0 || sessionStatus !== "playing" || !hintGateUnlocked}
            aria-label={
              hintGateUnlocked
                ? "Use hint"
                : `Hints unlock after ${puzzle.hintGate?.unlockAfterCorrectMarks ?? 0} correct marks`
            }
          >
            <Lightbulb className="h-5 w-5" strokeWidth={1.8} />
            <span className="absolute -right-0.5 -top-1 min-w-5 rounded-full bg-[var(--accent-pop)] px-1.5 py-0.5 text-[0.65rem] font-black leading-none text-[var(--fg)]">
              {hintGateUnlocked ? hintStock : <Lock className="h-3 w-3" />}
            </span>
          </IconActionButton>
          <IconActionButton
            type="button"
            onClick={onReroll}
            aria-label="Build a new board for this level"
          >
            <RefreshCw className="h-5 w-5" strokeWidth={1.8} />
          </IconActionButton>
          <IconActionButton
            type="button"
            onClick={onToggleTheme}
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" strokeWidth={1.8} />
            ) : (
              <Moon className="h-5 w-5" strokeWidth={1.8} />
            )}
          </IconActionButton>
        </div>
      </div>

      <div className="mt-4 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:gap-5 xl:grid-cols-[minmax(18rem,0.75fr)_minmax(30rem,1.25fr)] xl:items-end">
        <div className="min-w-0">
          <p className="hidden text-xs font-black uppercase tracking-[0.26em] text-[var(--text-muted)] sm:block">
            {difficultyConfig.label} Chapter
          </p>
          <div className="flex flex-wrap items-center gap-2.5 sm:mt-2.5 sm:items-end sm:gap-3.5">
            <h1 className="game-number text-[2rem] font-black leading-none text-[var(--text-primary)] sm:text-6xl tracking-tight">
              <span className="sm:hidden">Lv </span>
              <span className="hidden sm:inline">Level </span>
              {puzzle.level}
            </h1>
            <div className="rounded-full bg-[var(--lemon)] px-3 py-1 text-[0.7rem] font-black uppercase tracking-[0.16em] text-[var(--fg)] sm:text-xs sm:tracking-[0.22em] shadow-[0_4px_12px_var(--glow-secondary)]">
              {difficultyConfig.badge}
            </div>
          </div>
          <div className="mt-2.5 hidden items-center gap-2 sm:flex">
            {Array.from({ length: 3 }, (_, index) => (
              <Star
                key={index}
                className={`h-5 w-5 ${
                  index < (currentResult?.stars ?? 0)
                    ? "fill-[var(--lemon)] text-[var(--lemon)]"
                    : "text-[var(--panel-border)]"
                }`}
                strokeWidth={1.8}
              />
            ))}
            <span className="text-xs font-medium text-[var(--text-secondary)] ml-1">
              Best run on this level
            </span>
          </div>
        </div>

        <DifficultyRail
          className="hidden sm:flex xl:justify-start"
          difficulty={difficulty}
          onChange={onChangeDifficulty}
          progress={progress}
        />
      </div>
    </>
  );
}
