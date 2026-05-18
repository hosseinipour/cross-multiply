import { CheckCircle2, Eraser, Sparkles, X } from "lucide-react";
import {
  getLevelResult,
  getNextLockedDifficulty,
  type ProgressState,
  type SessionState,
} from "../appState";
import { DIFFICULTIES, type DifficultyId, type Puzzle, type ToolMode } from "../game";
import {
  getDifficultyUnlockRequirement,
  getDifficultyUnlockSource,
  type ModifierId,
} from "../progression";
import { HapticButton } from "./HapticButton";
import { SidebarPanel } from "./SidebarPanel";
import { ToolButton } from "./ToolButton";

const teachingModifierIds: ModifierId[] = [
  "deepFog",
  "crossBlind",
  "commitLine",
  "toolLock",
  "sealedCells",
  "spotlightLine",
  "hintGate",
  "quietProgress",
  "noEcho",
  "cloakedCells",
  "factorCipher",
];

export function GameSidebar({
  difficulty,
  dismissedModifierTips,
  onDismissModifierTip,
  onModeChange,
  progress,
  puzzle,
  session,
}: {
  difficulty: DifficultyId;
  dismissedModifierTips: Partial<Record<ModifierId, boolean>>;
  onDismissModifierTip: (modifierId: ModifierId) => void;
  onModeChange: (mode: ToolMode) => void;
  progress: ProgressState;
  puzzle: Puzzle;
  session: SessionState;
}) {
  const currentResult = getLevelResult(progress, difficulty, puzzle.level);
  const teachingModifiers = puzzle.modifiers.filter(
    (modifier) =>
      teachingModifierIds.includes(modifier.id) &&
      !dismissedModifierTips[modifier.id],
  );
  const nextLockedDifficulty = getNextLockedDifficulty(progress);
  const nextUnlockSource = nextLockedDifficulty
    ? getDifficultyUnlockSource(nextLockedDifficulty)
    : null;
  const nextUnlockRequirement = nextLockedDifficulty
    ? getDifficultyUnlockRequirement(nextLockedDifficulty)
    : 0;
  const nextUnlockProgress = nextUnlockSource
    ? progress[nextUnlockSource].clearedLevels
    : 0;
  const nextUnlockPercent =
    nextUnlockRequirement > 0
      ? Math.min(100, (nextUnlockProgress / nextUnlockRequirement) * 100)
      : 0;

  return (
    <div className="space-y-3 lg:sticky lg:top-5 lg:max-h-[calc(100vh-2.5rem)] lg:overflow-y-auto lg:pr-1">
      <div className="hidden lg:block">
        <SidebarPanel title="Tools">
          <div className="grid grid-cols-2 gap-3">
            <ToolButton
              active={session.mode === "erase"}
              onClick={() => onModeChange("erase")}
              disabled={session.toolLocked && session.mode !== "erase"}
              label="Erase"
              meta={
                session.toolLocked && session.mode !== "erase"
                  ? "Locked for now"
                  : undefined
              }
              icon={<Eraser className="h-5 w-5" strokeWidth={1.8} />}
            />
            <ToolButton
              active={session.mode === "select"}
              onClick={() => onModeChange("select")}
              disabled={session.toolLocked && session.mode !== "select"}
              label="Select"
              meta={
                session.toolLocked && session.mode !== "select"
                  ? "Locked for now"
                  : undefined
              }
              icon={<CheckCircle2 className="h-5 w-5" strokeWidth={1.8} />}
            />
          </div>
        </SidebarPanel>
      </div>

      <SidebarPanel
        title="Rules"
        meta={puzzle.modifiers.length ? `${puzzle.modifiers.length} active` : "Classic"}
        defaultOpen={teachingModifiers.length > 0}
      >
        <div className="space-y-3">
          {puzzle.modifiers.length === 0 && (
            <div className="rounded-[1.2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_35%,transparent)]">
              Classic board. Select factors and erase extras.
            </div>
          )}
          {teachingModifiers.map((modifier) => (
            <div
              key={`tip-${modifier.id}`}
              className="rounded-[1.2rem] border border-[var(--sky)]/35 bg-[color-mix(in_oklch,var(--sky)_14%,transparent)] px-4 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[0.18em] text-[var(--sky)]">
                    New rule
                  </div>
                  <h2 className="mt-1 text-sm font-black text-[var(--text-primary)]">
                    {modifier.title}
                  </h2>
                </div>
                <HapticButton
                  type="button"
                  onClick={() => onDismissModifierTip(modifier.id)}
                  className="rounded-full border border-[var(--sky)]/25 bg-[var(--panel-bg)]/55 p-1 text-[var(--sky)] transition hover:bg-[var(--panel-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sky)]"
                  aria-label={`Dismiss ${modifier.title} tip`}
                >
                  <X className="h-4 w-4" strokeWidth={1.8} />
                </HapticButton>
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                {modifier.description}
              </p>
            </div>
          ))}
          {teachingModifiers.length === 0 &&
            puzzle.modifiers.map((modifier) => (
              <div
                key={modifier.id}
                className="flex items-center gap-2 rounded-[1.2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_35%,transparent)]"
              >
                <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                {modifier.title}
              </div>
            ))}
        </div>
      </SidebarPanel>

      <SidebarPanel title="Missions" meta="Optional goals" defaultOpen={false}>
        <div className="space-y-3">
          {puzzle.missions.map((mission) => {
            const completed =
              currentResult?.missionsCompleted.includes(mission.id) ?? false;

            return (
              <div
                key={mission.id}
                className={`rounded-[1.2rem] border px-4 py-3 ${
                  completed
                    ? "border-[var(--success)]/35 bg-[color-mix(in_oklch,var(--success)_16%,transparent)]"
                    : "border-[var(--panel-border)] bg-[var(--panel-bg)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_35%,transparent)]"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                    {mission.title}
                  </h2>
                  {completed && (
                    <CheckCircle2
                      className="h-4 w-4 text-[var(--success)]"
                      strokeWidth={1.8}
                    />
                  )}
                </div>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">
                  {mission.description}
                </p>
              </div>
            );
          })}
        </div>
      </SidebarPanel>

      <SidebarPanel title="Progress" defaultOpen={false}>
        <div className="rounded-[1.2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-4 shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_35%,transparent)]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div>
              <div className="game-number text-lg font-black text-[var(--text-primary)]">
                {progress[difficulty].clearedLevels} levels cleared
              </div>
              <div className="mt-1 text-sm text-[var(--text-secondary)]">
                Highest unlocked: Level {progress[difficulty].highestUnlockedLevel}
              </div>
            </div>
            <div className="text-sm text-[var(--text-secondary)] sm:text-right">
              {nextLockedDifficulty && nextUnlockSource ? (
                <>
                  <div>Next chapter: {DIFFICULTIES[nextLockedDifficulty].label}</div>
                  <div>
                    {Math.min(nextUnlockProgress, nextUnlockRequirement)}/
                    {nextUnlockRequirement}{" "}
                    {DIFFICULTIES[nextUnlockSource].label.toLowerCase()} clears
                  </div>
                </>
              ) : (
                <div>Final chapter unlocked</div>
              )}
            </div>
          </div>
          {nextLockedDifficulty && (
            <div className="mt-4 h-2 rounded-full bg-[color-mix(in_oklch,var(--panel-border)_65%,transparent)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] shadow-[0_0_14px_var(--glow-primary)]"
                style={{ width: `${nextUnlockPercent}%` }}
              />
            </div>
          )}
        </div>
      </SidebarPanel>
    </div>
  );
}
