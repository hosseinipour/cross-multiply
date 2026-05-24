import { useState } from "react";
import { CheckCircle2, Eraser, Sparkles, X, BookOpen, Trophy, TrendingUp } from "lucide-react";
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

type SidebarTab = "rules" | "missions" | "progress";

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

  const teachingKey = teachingModifiers.map((modifier) => modifier.id).join("|");
  const [tabSelection, setTabSelection] = useState<{
    tab: SidebarTab;
    teachingKey: string;
  }>(() => {
    return {
      tab: teachingModifiers.length > 0 ? "rules" : "missions",
      teachingKey,
    };
  });
  const activeTab =
    teachingModifiers.length > 0 && tabSelection.teachingKey !== teachingKey
      ? "rules"
      : tabSelection.tab;

  const tabs = [
    { id: "rules" as const, label: "Rules", icon: <BookOpen className="h-4 w-4" /> },
    { id: "missions" as const, label: "Missions", icon: <Trophy className="h-4 w-4" /> },
    { id: "progress" as const, label: "Progress", icon: <TrendingUp className="h-4 w-4" /> },
  ];

  return (
    <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1 custom-scrollbar">
      {/* Desktop Tools Selector */}
      <div className="hidden lg:block">
        <div className="spotlight-slab rounded-[2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/85 p-5 shadow-[0_16px_40px_var(--shadow-soft)] backdrop-blur-md">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)] mb-3">
            Active Tools
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ToolButton
              active={session.mode === "erase"}
              onClick={() => onModeChange("erase")}
              disabled={session.toolLocked && session.mode !== "erase"}
              label="Erase"
              meta={
                session.toolLocked && session.mode !== "erase"
                  ? "Locked"
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
                  ? "Locked"
                  : undefined
              }
              icon={<CheckCircle2 className="h-5 w-5" strokeWidth={1.8} />}
            />
          </div>
        </div>
      </div>

      {/* Tab Deck */}
      <div className="spotlight-slab rounded-[2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/85 p-5 shadow-[0_16px_40px_var(--shadow-soft)] backdrop-blur-md flex flex-col gap-4">
        {/* Tab Buttons bar */}
        <div className="flex gap-1 rounded-[1.2rem] bg-[var(--panel-muted)]/70 p-1 border border-[var(--panel-border)]/40">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <HapticButton
                key={tab.id}
                type="button"
                onClick={() => setTabSelection({ tab: tab.id, teachingKey })}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-[0.95rem] py-2.5 text-xs transition duration-200 ${
                  active
                    ? "bg-[var(--accent)] text-[var(--cell-highlight-text)] font-black shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--accent-strong)_30%,transparent),0_4px_12px_var(--glow-primary)]"
                    : "text-[var(--text-secondary)] font-bold hover:bg-[var(--panel-bg)]/60"
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </HapticButton>
            );
          })}
        </div>

        {/* Tab Content Panels */}
        <div className="mt-1 min-h-[12rem] flex flex-col justify-between">
          <div className="animate-spring-in">
            {activeTab === "rules" && (
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-2 border-b border-[var(--panel-border)]">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">
                    Board Modifiers
                  </p>
                  <span className="rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[var(--accent-strong)]">
                    {puzzle.modifiers.length ? `${puzzle.modifiers.length} Active` : "Classic"}
                  </span>
                </div>

                {puzzle.modifiers.length === 0 ? (
                  <div className="rounded-[1.25rem] border border-[var(--panel-border)] bg-[var(--panel-muted)]/45 px-4 py-4 text-xs font-semibold leading-relaxed text-[var(--text-secondary)]">
                    No active modifiers. Locate cells that multiply to the targets, and mark others as erased.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {teachingModifiers.map((modifier) => (
                      <div
                        key={`tip-${modifier.id}`}
                        className="rounded-[1.25rem] border border-[var(--sky)]/35 bg-[color-mix(in_oklch,var(--sky)_10%,transparent)] p-4 shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-[var(--sky)]">
                              Constraint Active
                            </div>
                            <h3 className="mt-1 text-sm font-black text-[var(--text-primary)]">
                              {modifier.title}
                            </h3>
                          </div>
                          <HapticButton
                            type="button"
                            onClick={() => onDismissModifierTip(modifier.id)}
                            className="rounded-full border border-[var(--sky)]/25 bg-[var(--panel-bg)]/60 p-1 text-[var(--sky)] transition hover:bg-[var(--panel-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
                            aria-label={`Dismiss ${modifier.title} tip`}
                          >
                            <X className="h-3.5 w-3.5" strokeWidth={2} />
                          </HapticButton>
                        </div>
                        <p className="mt-2.5 text-xs leading-relaxed text-[var(--text-secondary)]">
                          {modifier.description}
                        </p>
                      </div>
                    ))}

                    {teachingModifiers.length === 0 &&
                      puzzle.modifiers.map((modifier) => (
                        <div
                          key={modifier.id}
                          className="flex items-start gap-2.5 rounded-[1.25rem] border border-[var(--panel-border)] bg-[var(--panel-muted)]/50 p-3.5 text-xs font-semibold leading-relaxed text-[var(--text-primary)]"
                        >
                          <Sparkles className="h-4 w-4 shrink-0 text-[var(--accent)] mt-0.5" />
                          <div>
                            <span className="font-bold text-[var(--text-primary)]">{modifier.title}:</span>{" "}
                            <span className="text-[var(--text-secondary)]">{modifier.short}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === "missions" && (
              <div className="space-y-3">
                <div className="pb-2 border-b border-[var(--panel-border)]">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">
                    Level Missions
                  </p>
                </div>
                <div className="space-y-3">
                  {puzzle.missions.map((mission) => {
                    const completed =
                      currentResult?.missionsCompleted.includes(mission.id) ?? false;

                    return (
                      <div
                        key={mission.id}
                        className={`rounded-[1.25rem] border p-4 spring-transition ${
                          completed
                            ? "border-[var(--success)]/35 bg-[color-mix(in_oklch,var(--success)_10%,transparent)] shadow-[0_4px_12px_rgba(34,197,94,0.06)]"
                            : "border-[var(--panel-border)] bg-[var(--panel-muted)]/30 hover:bg-[var(--panel-muted)]/60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="text-xs font-black uppercase tracking-[0.06em] text-[var(--text-primary)]">
                            {mission.title}
                          </h3>
                          {completed ? (
                            <CheckCircle2
                              className="h-4 w-4 text-[var(--success)] shrink-0"
                              strokeWidth={2}
                            />
                          ) : (
                            <span className="text-[0.6rem] font-black uppercase tracking-[0.16em] text-[var(--text-faint)]">
                              Incomplete
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-xs leading-relaxed text-[var(--text-secondary)]">
                          {mission.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === "progress" && (
              <div className="space-y-4">
                <div className="pb-2 border-b border-[var(--panel-border)]">
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">
                    Chapter Statistics
                  </p>
                </div>

                <div className="rounded-[1.25rem] border border-[var(--panel-border)] bg-[var(--panel-muted)]/40 p-4 flex flex-col gap-3 shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]">
                  <div>
                    <div className="game-number text-2xl font-black text-[var(--text-primary)]">
                      {progress[difficulty].clearedLevels}
                    </div>
                    <div className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)] mt-0.5">
                      Levels Cleared
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--panel-border)]/50 flex flex-col gap-1 text-xs text-[var(--text-secondary)]">
                    <div className="flex justify-between">
                      <span>Highest unlocked level:</span>
                      <span className="font-bold text-[var(--text-primary)]">Level {progress[difficulty].highestUnlockedLevel}</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-[1.25rem] border border-[var(--panel-border)] bg-[var(--panel-muted)]/40 p-4 text-xs text-[var(--text-secondary)]">
                  {nextLockedDifficulty && nextUnlockSource ? (
                    <div className="flex flex-col gap-3">
                      <div>
                        <div className="font-bold text-[var(--text-primary)] mb-0.5">
                          Unlocking {DIFFICULTIES[nextLockedDifficulty].label}
                        </div>
                        <div className="text-[0.68rem] text-[var(--text-secondary)] leading-relaxed">
                          Requires {nextUnlockRequirement} cleared boards in {DIFFICULTIES[nextUnlockSource].label}.
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="flex items-center gap-3">
                        <div className="h-2 flex-1 rounded-full bg-[var(--panel-border)] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--accent)] shadow-[0_0_12px_var(--glow-primary)] transition-all duration-500"
                            style={{ width: `${nextUnlockPercent}%` }}
                          />
                        </div>
                        <span className="game-number text-xs font-black min-w-[2.5rem] text-right">
                          {Math.min(nextUnlockProgress, nextUnlockRequirement)}/{nextUnlockRequirement}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 font-bold text-[var(--success)] py-1">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span>All chapters fully unlocked!</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
