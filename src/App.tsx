import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import {
  CheckCircle2,
  Eraser,
  Heart,
  Lightbulb,
  Lock,
  Moon,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Star,
  Sun,
  X,
} from "lucide-react";
import {
  applyRevealedMarks,
  areAllRowTargetsMet,
  countMatchedTargetsOnAxis,
  createEmptyMarks,
  createPuzzle,
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  getColProgress,
  getCorrectMarkCount,
  getDelayedCellProgress,
  getFactorCipherProgress,
  getNextCommitment,
  getNextNoEchoLine,
  getPrimeFactors,
  getSpotlightProgress,
  getTargetConcealment,
  getVisibleTarget,
  hasVisibleMatchedTarget,
  isCellBlockedByNoEcho,
  isCellBlockedBySpotlight,
  isCellBlockedByCommitment,
  isCellDelayed,
  isColResolved,
  isHintGateUnlocked,
  isPuzzleSolved,
  isProgressHidden,
  isTargetCiphered,
  revealHint,
  type ActiveCommitment,
  type CellMark,
  type DifficultyId,
  type Puzzle,
  type ToolMode,
} from "./game";
import { HapticButton } from "./components/HapticButton";
import { Hearts } from "./components/Hearts";
import {
  vibrateOnCorrectPick,
  vibrateOnMistake,
} from "./components/haptics";
import { RowFragment } from "./components/RowFragment";
import { ToolButton } from "./components/ToolButton";
import {
  getDifficultyUnlockRequirement,
  getDifficultyUnlockSource,
  type MissionId,
  type ModifierId,
} from "./progression";

type ThemeMode = "dark" | "light";
type GameStatus = "playing" | "won" | "lost";

type RunSummary = {
  heartsLeft: number;
  maxHearts: number;
  hintsUsed: number;
  mistakes: number;
};

type LevelResult = {
  stars: number;
  missionsCompleted: MissionId[];
  bestRun: RunSummary;
};

type DifficultyProgress = {
  highestUnlockedLevel: number;
  clearedLevels: number;
  levelResults: Record<string, LevelResult>;
};

type ProgressState = Record<DifficultyId, DifficultyProgress>;

type SessionState = {
  puzzle: Puzzle;
  marks: CellMark[][];
  hearts: number;
  maxHearts: number;
  mode: ToolMode;
  status: GameStatus;
  focusKey: string | null;
  hintsUsed: number;
  mistakes: number;
  eraseUsedBeforeRowsResolved: boolean;
  toolLocked: boolean;
  activeCommitment: ActiveCommitment | null;
  noEchoLine: ActiveCommitment | null;
};

type PersistedState = {
  theme: ThemeMode;
  difficulty: DifficultyId;
  hintStock: number;
  session: SessionState;
  progress: ProgressState;
  dismissedModifierTips: Partial<Record<ModifierId, boolean>>;
  onboardingDismissed: boolean;
};

const STORAGE_KEY = "cross-multiply-state-v2";
const LEGACY_STORAGE_KEY = "cross-multiply-state";
const STARTING_HINTS = 3;
const MAX_HINT_STOCK = 10;
const CHEAT_TOGGLE_COUNT = 10;
const CHEAT_TOGGLE_WINDOW_MS = 4000;

function createProgressState(): ProgressState {
  return Object.fromEntries(
    DIFFICULTY_ORDER.map((id) => [
      id,
      {
        highestUnlockedLevel: 1,
        clearedLevels: 0,
        levelResults: {},
      },
    ]),
  ) as ProgressState;
}

function buildSession(difficulty: DifficultyId, level: number): SessionState {
  const puzzle = createPuzzle(level, difficulty);
  return buildSessionFromPuzzle(puzzle);
}

function buildSessionFromPuzzle(puzzle: Puzzle): SessionState {
  const marks = applyRevealedMarks(createEmptyMarks(puzzle.size), puzzle.revealedMarks);

  return {
    puzzle,
    marks,
    hearts: puzzle.maxHearts,
    maxHearts: puzzle.maxHearts,
    mode: puzzle.toolLock?.initialMode ?? "select",
    status: "playing",
    focusKey: null,
    hintsUsed: 0,
    mistakes: 0,
    eraseUsedBeforeRowsResolved: false,
    toolLocked: Boolean(puzzle.toolLock),
    activeCommitment: null,
    noEchoLine: null,
  };
}

function isDifficultyAvailable(progress: ProgressState, difficulty: DifficultyId) {
  const unlockSource = getDifficultyUnlockSource(difficulty);

  if (!unlockSource) {
    return true;
  }

  return (
    progress[unlockSource].clearedLevels >=
    getDifficultyUnlockRequirement(difficulty)
  );
}

function getNextLockedDifficulty(progress: ProgressState) {
  return (
    DIFFICULTY_ORDER.find((id) => !isDifficultyAvailable(progress, id)) ?? null
  );
}

function unlockAllDifficulties(progress: ProgressState): ProgressState {
  const requiredClears = Object.fromEntries(
    DIFFICULTY_ORDER.map((id) => [id, 0]),
  ) as Record<DifficultyId, number>;

  for (const difficulty of DIFFICULTY_ORDER) {
    const source = getDifficultyUnlockSource(difficulty);

    if (!source) {
      continue;
    }

    requiredClears[source] = Math.max(
      requiredClears[source],
      getDifficultyUnlockRequirement(difficulty),
    );
  }

  return Object.fromEntries(
    DIFFICULTY_ORDER.map((id) => {
      const clearedLevels = Math.max(
        progress[id].clearedLevels,
        requiredClears[id],
      );

      return [
        id,
        {
          ...progress[id],
          clearedLevels,
          highestUnlockedLevel: Math.max(
            progress[id].highestUnlockedLevel,
            clearedLevels + 1,
          ),
        },
      ];
    }),
  ) as ProgressState;
}

function loadPersistedState(): PersistedState {
  const progress = createProgressState();
  const fallback: PersistedState = {
    theme: "light",
    difficulty: "easy",
    hintStock: STARTING_HINTS,
    progress,
    session: buildSession("easy", 1),
    dismissedModifierTips: {},
    onboardingDismissed: false,
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY);

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedState> & {
      unlocked?: Partial<Record<DifficultyId, number>>;
      session?: { puzzle?: { level?: number } };
    };

    const nextProgress = createProgressState();
    if (parsed.progress) {
      for (const id of DIFFICULTY_ORDER) {
        nextProgress[id] = {
          ...nextProgress[id],
          ...parsed.progress[id],
          levelResults: parsed.progress[id]?.levelResults ?? {},
        };
      }
    } else if (parsed.unlocked) {
      for (const id of DIFFICULTY_ORDER) {
        nextProgress[id].highestUnlockedLevel = Math.max(
          1,
          parsed.unlocked[id] ?? 1,
        );
      }
    }

    const preferredDifficulty =
      parsed.difficulty && parsed.difficulty in DIFFICULTIES
        ? parsed.difficulty
        : "easy";
    const difficulty = isDifficultyAvailable(nextProgress, preferredDifficulty)
      ? preferredDifficulty
      : "easy";
    const level = Math.max(
      1,
      parsed.session?.puzzle?.level ??
        nextProgress[difficulty].highestUnlockedLevel ??
        1,
    );

    return {
      theme: parsed.theme === "light" ? "light" : "dark",
      difficulty,
      hintStock:
        typeof parsed.hintStock === "number"
          ? Math.max(0, Math.min(MAX_HINT_STOCK, parsed.hintStock))
          : STARTING_HINTS,
      progress: nextProgress,
      session: buildSession(
        difficulty,
        Math.min(level, nextProgress[difficulty].highestUnlockedLevel),
      ),
      dismissedModifierTips: parsed.dismissedModifierTips ?? {},
      onboardingDismissed: Boolean(parsed.onboardingDismissed),
    };
  } catch {
    return fallback;
  }
}

function getLevelResult(progress: ProgressState, difficulty: DifficultyId, level: number) {
  return progress[difficulty].levelResults[String(level)] ?? null;
}

function computeStars(_puzzle: Puzzle, run: RunSummary) {
  let stars = 1;

  if (
    run.hintsUsed === 0 &&
    run.mistakes === 0 &&
    run.heartsLeft >= Math.max(1, run.maxHearts - 1)
  ) {
    stars = 3;
  } else if (run.heartsLeft > 0 && run.mistakes <= 1 && run.hintsUsed <= 1) {
    stars = 2;
  }

  return stars;
}

function evaluateMissions(
  puzzle: Puzzle,
  run: RunSummary,
  eraseUsedBeforeRowsResolved: boolean,
) {
  return puzzle.missions
    .filter((mission) => {
      if (mission.id === "flawless") {
        return run.mistakes === 0;
      }

      if (mission.id === "noHints") {
        return run.hintsUsed === 0;
      }

      if (mission.id === "rowRush") {
        return !eraseUsedBeforeRowsResolved;
      }

      return false;
    })
    .map((mission) => mission.id);
}

function isBetterRun(candidate: LevelResult, previous?: LevelResult) {
  if (!previous) {
    return true;
  }

  if (candidate.stars !== previous.stars) {
    return candidate.stars > previous.stars;
  }

  if (candidate.missionsCompleted.length !== previous.missionsCompleted.length) {
    return (
      candidate.missionsCompleted.length > previous.missionsCompleted.length
    );
  }

  if (candidate.bestRun.heartsLeft !== previous.bestRun.heartsLeft) {
    return candidate.bestRun.heartsLeft > previous.bestRun.heartsLeft;
  }

  return candidate.bestRun.hintsUsed < previous.bestRun.hintsUsed;
}

function getToolLockState(
  puzzle: Puzzle,
  marks: CellMark[][],
  current: boolean,
) {
  if (!current || !puzzle.toolLock) {
    return false;
  }

  return !hasVisibleMatchedTarget(puzzle, marks);
}

const iconButtonClass =
  "relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] p-3 text-[var(--text-primary)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_45%,transparent)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50";

const secondaryActionClass =
  "rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-3 text-sm font-black text-[var(--text-primary)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_45%,transparent)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]";

const primaryActionClass =
  "rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-[var(--cell-highlight-text)] shadow-[0_12px_30px_var(--glow-primary)] transition hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent-strong)]";

const statusPillToneClass = {
  neutral:
    "border-[var(--panel-border)] bg-[var(--panel-muted)] text-[var(--text-secondary)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_35%,transparent)]",
  lemon:
    "border-[var(--lemon)]/45 bg-[color-mix(in_oklch,var(--lemon)_22%,transparent)] text-[var(--text-primary)]",
  sky:
    "border-[var(--sky)]/35 bg-[color-mix(in_oklch,var(--sky)_16%,transparent)] text-[var(--sky)]",
  berry:
    "border-[var(--berry)]/35 bg-[color-mix(in_oklch,var(--berry)_16%,transparent)] text-[var(--berry)]",
  danger:
    "border-[var(--danger)]/35 bg-[color-mix(in_oklch,var(--danger)_16%,transparent)] text-[var(--danger)]",
  accent:
    "border-[var(--accent)]/35 bg-[var(--accent-soft)] text-[var(--accent-strong)]",
} as const;

type StatusPillTone = keyof typeof statusPillToneClass;

function IconActionButton({
  children,
  className = "",
  title,
  ...props
}: {
  children: ReactNode;
} & ComponentProps<typeof HapticButton>) {
  const fallbackTitle =
    title ??
    (typeof props["aria-label"] === "string" ? props["aria-label"] : undefined);

  return (
    <HapticButton
      {...props}
      title={fallbackTitle}
      className={`${iconButtonClass} ${className}`}
    >
      {children}
    </HapticButton>
  );
}

function StatusPill({
  children,
  icon,
  tone = "neutral",
}: {
  children: ReactNode;
  icon: ReactNode;
  tone?: StatusPillTone;
}) {
  return (
    <div
      className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] ${statusPillToneClass[tone]}`}
    >
      {icon}
      {children}
    </div>
  );
}

function SidebarPanel({
  children,
  defaultOpen = true,
  meta,
  title,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  meta?: ReactNode;
  title: string;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-[1.6rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] p-3 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--surface)_55%,transparent)] sm:rounded-[1.75rem] sm:p-4"
    >
      <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">
          {title}
        </span>
        {meta && (
          <span className="text-xs text-[var(--text-secondary)]">{meta}</span>
        )}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}

function DialogShell({
  actions,
  children,
  icon,
  size = "sm",
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  icon: ReactNode;
  size?: "sm" | "lg";
  title: string;
}) {
  const titleId = useId();

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-[oklch(15%_0.02_230/0.5)] p-3 py-6 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`dialog-surface max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-[2rem] border border-[var(--panel-border)] p-5 shadow-[0_24px_80px_var(--shadow-board)] sm:p-6 ${
          size === "lg" ? "max-w-lg" : "max-w-sm text-center"
        }`}
      >
        {icon}
        <h2
          id={titleId}
          className={`mt-4 text-3xl font-black text-[var(--text-primary)] ${
            size === "lg" ? "text-center" : ""
          }`}
        >
          {title}
        </h2>
        {children}
        {actions && <div className="mt-6 grid gap-3 sm:grid-cols-2">{actions}</div>}
      </div>
    </div>
  );
}

function ResultStat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-[1.2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-2.5 text-center shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_35%,transparent)] sm:px-4 sm:py-3">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)] sm:text-xs sm:tracking-[0.22em]">
        {label}
      </div>
      <div className="game-number mt-1.5 text-xl font-black text-[var(--text-primary)] sm:mt-2 sm:text-2xl">
        {value}
      </div>
    </div>
  );
}

type FirstRunStage = "firstMark" | "firstLine" | "rhythm";

function FirstRunCoach({
  onDismiss,
  stage,
}: {
  onDismiss: () => void;
  stage: FirstRunStage;
}) {
  const stageCopy = {
    firstMark: {
      title: "Start with one edge target",
      body: "Choose a row or column target. Select numbers in that line that multiply to it.",
      action: "Hide guide",
    },
    firstLine: {
      title: "Good mark. Complete the target",
      body: "When your selected numbers multiply to the edge target, that line clears. Erase numbers that do not fit.",
      action: "Got it",
    },
    rhythm: {
      title: "You have the rhythm",
      body: "Clear edge targets one by one. Use a hint when the next line stalls.",
      action: "Got it",
    },
  } satisfies Record<
    FirstRunStage,
    { title: string; body: string; action: string }
  >;
  const current = stageCopy[stage];

  return (
    <div
      aria-live="polite"
      className="mb-4 w-full rounded-[1.35rem] border border-[var(--sky)]/35 bg-[color-mix(in_oklch,var(--sky)_12%,var(--panel-bg))] px-4 py-3 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--surface)_45%,transparent)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-[65ch]">
          <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[var(--sky)]">
            First board
          </div>
          <h2 className="mt-1 text-base font-black text-[var(--text-primary)]">
            {current.title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
            {current.body}
          </p>
        </div>
        <HapticButton
          type="button"
          onClick={onDismiss}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-[var(--sky)]/35 bg-[var(--panel-bg)] px-4 text-xs font-black uppercase tracking-[0.18em] text-[var(--text-primary)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--sky)_18%,transparent)] transition hover:-translate-y-0.5 hover:bg-[var(--panel-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sky)]"
          aria-label="Dismiss first board guide"
        >
          {current.action}
        </HapticButton>
      </div>

      <div className="mt-3 grid gap-2 text-xs font-bold text-[var(--text-secondary)] sm:grid-cols-3">
        <div className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3">
          <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.8} />
          Select factors
        </div>
        <div className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3">
          <Eraser className="h-4 w-4 text-[var(--text-muted)]" strokeWidth={1.8} />
          Erase extras
        </div>
        <div className="flex min-h-11 items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3">
          <Lightbulb className="h-4 w-4 text-[var(--accent-pop)]" strokeWidth={1.8} />
          Hint reveals one cell
        </div>
      </div>
    </div>
  );
}

function MobileToolDock({
  mode,
  onModeChange,
  toolLocked,
}: {
  mode: ToolMode;
  onModeChange: (mode: ToolMode) => void;
  toolLocked: boolean;
}) {
  const tools: Array<{ icon: ReactNode; label: string; mode: ToolMode }> = [
    {
      icon: <Eraser className="h-5 w-5" strokeWidth={1.8} />,
      label: "Erase",
      mode: "erase",
    },
    {
      icon: <CheckCircle2 className="h-5 w-5" strokeWidth={1.8} />,
      label: "Select",
      mode: "select",
    },
  ];

  return (
    <div className="fixed inset-x-3 bottom-3 z-30 rounded-[1.35rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 p-2 shadow-[0_18px_48px_var(--shadow-board)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-2 gap-2">
        {tools.map((tool) => {
          const active = mode === tool.mode;
          const disabled = toolLocked && !active;

          return (
            <HapticButton
              key={tool.mode}
              type="button"
              onClick={() => onModeChange(tool.mode)}
              disabled={disabled}
              className={`flex min-h-14 items-center justify-center gap-2 rounded-[1rem] border px-3 text-sm font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)] shadow-[inset_0_-3px_0_color-mix(in_oklch,var(--accent)_28%,transparent)]"
                  : "border-[var(--panel-border)] bg-[var(--panel-muted)] text-[var(--text-secondary)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_45%,transparent)] active:translate-y-0.5"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  active
                    ? "bg-[var(--accent)] text-[var(--cell-highlight-text)]"
                    : "bg-[var(--panel-bg)] text-[var(--text-muted)]"
                }`}
              >
                {tool.icon}
              </span>
              <span>{tool.label}</span>
            </HapticButton>
          );
        })}
      </div>
    </div>
  );
}

function App() {
  const [persisted, setPersisted] = useState<PersistedState>(() =>
    loadPersistedState(),
  );
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const themeToggleTimes = useRef<number[]>([]);

  const {
    difficulty,
    dismissedModifierTips,
    hintStock,
    onboardingDismissed,
    progress,
    session,
    theme,
  } = persisted;
  const puzzle = session.puzzle;
  const size = puzzle.size;
  const difficultyConfig = DIFFICULTIES[difficulty];
  const currentResult = getLevelResult(progress, difficulty, puzzle.level);
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
  const teachingModifiers = puzzle.modifiers.filter(
    (modifier) =>
      teachingModifierIds.includes(modifier.id) &&
      !dismissedModifierTips[modifier.id],
  );
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  }, [persisted, theme]);

  const setTheme = (nextTheme: ThemeMode) => {
    setPersisted((current) => ({
      ...current,
      theme: nextTheme,
    }));
  };

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    const now = Date.now();
    const recentToggles = [
      ...themeToggleTimes.current.filter(
        (time) => now - time <= CHEAT_TOGGLE_WINDOW_MS,
      ),
      now,
    ];

    if (recentToggles.length >= CHEAT_TOGGLE_COUNT) {
      themeToggleTimes.current = [];
      setUnlockDialogOpen(true);
      setPersisted((current) => ({
        ...current,
        theme: nextTheme,
        progress: unlockAllDifficulties(current.progress),
      }));
      return;
    }

    themeToggleTimes.current = recentToggles;
    setTheme(nextTheme);
  };

  const dismissModifierTip = (modifierId: ModifierId) => {
    setPersisted((current) => ({
      ...current,
      dismissedModifierTips: {
        ...current.dismissedModifierTips,
        [modifierId]: true,
      },
    }));
  };

  const dismissOnboarding = () => {
    setPersisted((current) => ({
      ...current,
      onboardingDismissed: true,
    }));
  };

  const replaceSession = (
    nextSession: SessionState,
    nextDifficultyId = difficulty,
  ) => {
    setPersisted((current) => ({
      ...current,
      difficulty: nextDifficultyId,
      session: nextSession,
    }));
  };

  const generateLevel = (nextDifficultyId: DifficultyId, level: number) => {
    startTransition(() => {
      replaceSession(buildSession(nextDifficultyId, level), nextDifficultyId);
    });
  };

  const setMode = (mode: ToolMode) => {
    if (session.toolLocked && mode !== session.mode) {
      return;
    }

    setPersisted((current) => {
      const rowTargetsMet = areAllRowTargetsMet(
        current.session.puzzle,
        current.session.marks,
      );

      return {
        ...current,
        session: {
          ...current.session,
          mode,
          eraseUsedBeforeRowsResolved:
            current.session.eraseUsedBeforeRowsResolved ||
            (mode === "erase" && !rowTargetsMet),
        },
      };
    });
  };

  const retryLevel = () => {
    replaceSession(buildSessionFromPuzzle(puzzle));
  };

  const rerollLevel = () => {
    replaceSession(buildSession(difficulty, puzzle.level));
  };

  const moveToNextLevel = () => {
    const nextLevel = puzzle.level + 1;
    setPersisted((current) => {
      const nextProgress = { ...current.progress };
      nextProgress[difficulty] = {
        ...nextProgress[difficulty],
        highestUnlockedLevel: Math.max(
          nextProgress[difficulty].highestUnlockedLevel,
          nextLevel,
        ),
      };

      return {
        ...current,
        progress: nextProgress,
        hintStock: Math.min(MAX_HINT_STOCK, current.hintStock + 1),
      };
    });
    generateLevel(difficulty, nextLevel);
  };

  const changeDifficulty = (nextDifficultyId: DifficultyId) => {
    if (
      nextDifficultyId === difficulty ||
      !isDifficultyAvailable(progress, nextDifficultyId)
    ) {
      return;
    }

    generateLevel(
      nextDifficultyId,
      progress[nextDifficultyId].highestUnlockedLevel,
    );
  };

  const finalizeWin = (
    nextMarks: CellMark[][],
    options?: {
      runOverrides?: Partial<RunSummary>;
      consumeHint?: boolean;
    },
  ) => {
    const run: RunSummary = {
      heartsLeft: options?.runOverrides?.heartsLeft ?? session.hearts,
      maxHearts: options?.runOverrides?.maxHearts ?? session.maxHearts,
      hintsUsed: options?.runOverrides?.hintsUsed ?? session.hintsUsed,
      mistakes: options?.runOverrides?.mistakes ?? session.mistakes,
    };
    const missionsCompleted = evaluateMissions(
      puzzle,
      run,
      session.eraseUsedBeforeRowsResolved,
    );
    const result: LevelResult = {
      stars: computeStars(puzzle, run),
      missionsCompleted,
      bestRun: run,
    };

    setPersisted((current) => {
      const nextProgress = { ...current.progress };
      const currentDifficultyProgress = nextProgress[difficulty];
      const previous =
        currentDifficultyProgress.levelResults[String(current.session.puzzle.level)];
      const levelResults = {
        ...currentDifficultyProgress.levelResults,
        [String(current.session.puzzle.level)]: isBetterRun(result, previous)
          ? result
          : previous,
      };
      const clearedLevels = Object.keys(levelResults).length;

      nextProgress[difficulty] = {
        ...currentDifficultyProgress,
        levelResults,
        clearedLevels,
        highestUnlockedLevel: Math.max(
          currentDifficultyProgress.highestUnlockedLevel,
          current.session.puzzle.level + 1,
        ),
      };

      return {
        ...current,
        progress: nextProgress,
        hintStock: options?.consumeHint
          ? Math.max(0, current.hintStock - 1)
          : current.hintStock,
        session: {
          ...current.session,
          marks: nextMarks,
          hintsUsed: run.hintsUsed,
          status: "won",
        },
      };
    });
  };

  const applyCorrectMark = (row: number, col: number, mark: CellMark) => {
    const nextMarks = session.marks.map((line) => [...line]);
    nextMarks[row][col] = mark;
    const solved = isPuzzleSolved(puzzle, nextMarks);
    const nextToolLocked = getToolLockState(puzzle, nextMarks, session.toolLocked);
    const nextCommitment = getNextCommitment(
      puzzle,
      nextMarks,
      session.activeCommitment,
      row,
      col,
    );
    const nextNoEchoLine = getNextNoEchoLine(
      puzzle,
      nextMarks,
      session.noEchoLine,
      row,
      col,
    );

    if (solved) {
      finalizeWin(nextMarks);
      return;
    }

    setPersisted((current) => ({
      ...current,
      session: {
        ...current.session,
        marks: nextMarks,
        focusKey: `${row}-${col}-${Date.now()}`,
        toolLocked: nextToolLocked,
        activeCommitment: nextCommitment,
        noEchoLine: nextNoEchoLine,
      },
    }));
  };

  const handleCellPress = (row: number, col: number) => {
    if (
      session.status !== "playing" ||
      session.marks[row][col] !== "hidden" ||
      isCellDelayed(puzzle, session.marks, row, col) ||
      isCellBlockedBySpotlight(puzzle, session.marks, row, col) ||
      isCellBlockedByCommitment(session.activeCommitment, row, col) ||
      isCellBlockedByNoEcho(session.noEchoLine, row, col)
    ) {
      return;
    }

    const shouldSelect = puzzle.solution[row][col];
    const pickedMark: CellMark =
      session.mode === "select" ? "selected" : "erased";
    const expectedMark: CellMark = shouldSelect ? "selected" : "erased";

    if (pickedMark === expectedMark) {
      vibrateOnCorrectPick();
      applyCorrectMark(row, col, expectedMark);
      return;
    }

    const nextHearts = session.hearts - 1;
    vibrateOnMistake();

    setPersisted((current) => ({
      ...current,
      session: {
        ...current.session,
        hearts: nextHearts,
        mistakes: current.session.mistakes + 1,
        status: nextHearts <= 0 ? "lost" : "playing",
        focusKey: `${row}-${col}-miss-${Date.now()}`,
      },
    }));
  };

  const useHint = () => {
    if (session.status !== "playing" || hintStock <= 0 || !hintGateUnlocked) {
      return;
    }

    const hint = revealHint(puzzle, session.marks, {
      activeCommitment: session.activeCommitment,
      noEchoLine: session.noEchoLine,
    });

    if (!hint) {
      return;
    }

    const nextMarks = session.marks.map((line) => [...line]);
    nextMarks[hint.row][hint.col] = hint.mark;
    const solved = isPuzzleSolved(puzzle, nextMarks);
    const nextToolLocked = getToolLockState(puzzle, nextMarks, session.toolLocked);
    const nextCommitment = getNextCommitment(
      puzzle,
      nextMarks,
      session.activeCommitment,
    );
    const nextNoEchoLine = getNextNoEchoLine(
      puzzle,
      nextMarks,
      session.noEchoLine,
      hint.row,
      hint.col,
    );

    if (solved) {
      finalizeWin(nextMarks, {
        runOverrides: {
          hintsUsed: session.hintsUsed + 1,
        },
        consumeHint: true,
      });
      return;
    }

    setPersisted((current) => ({
      ...current,
      hintStock: Math.max(0, current.hintStock - 1),
      session: {
        ...current.session,
        marks: nextMarks,
        hintsUsed: current.session.hintsUsed + 1,
        focusKey: `${hint.row}-${hint.col}-hint-${Date.now()}`,
        toolLocked: nextToolLocked,
        activeCommitment: nextCommitment,
        noEchoLine: nextNoEchoLine,
      },
    }));
  };

  const boardColumnCount = size + 1;
  const boardStyle = {
    "--board-cell-size": `clamp(2.75rem, calc((100vw - 5.5rem) / ${boardColumnCount}), 4.6rem)`,
    "--board-gap": "clamp(0.35rem, 1.4vw, 0.75rem)",
    gap: "var(--board-gap)",
    gridAutoRows: "var(--board-cell-size)",
    gridTemplateColumns: `repeat(${boardColumnCount}, var(--board-cell-size))`,
    gridTemplateRows: `repeat(${boardColumnCount}, var(--board-cell-size))`,
  } as CSSProperties;
  const showFirstRunCoach =
    !onboardingDismissed &&
    difficulty === "easy" &&
    puzzle.level === 1 &&
    progress.easy.clearedLevels === 0 &&
    session.status === "playing";
  const firstRunStage: FirstRunStage =
    correctMarks === 0 ? "firstMark" : correctMarks < 3 ? "firstLine" : "rhythm";
  const boardStatusPills: Array<{
    key: string;
    icon: ReactNode;
    label: ReactNode;
    rank?: number;
    tone?: StatusPillTone;
  }> = [
    {
      key: "correct",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: <>Correct marks {correctMarks}</>,
      rank: 100,
    },
  ];

  if (session.noEchoLine) {
    boardStatusPills.push({
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
    boardStatusPills.push({
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
    boardStatusPills.push({
      key: "tool-lock",
      icon: <ShieldAlert className="h-3.5 w-3.5" />,
      label: <>Erase unlocks after one visible target match</>,
      rank: 90,
      tone: "lemon",
    });
  }

  if (puzzle.hintGate && !hintGateUnlocked) {
    boardStatusPills.push({
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
    boardStatusPills.push({
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
    boardStatusPills.push({
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
    boardStatusPills.push({
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
    boardStatusPills.push({
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
    boardStatusPills.push({
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

  const visibleBoardStatusPills = [...boardStatusPills]
    .sort((a, b) => (b.rank ?? 0) - (a.rank ?? 0))
    .slice(0, 3);
  const tuckedBoardStatusCount =
    boardStatusPills.length - visibleBoardStatusPills.length;
  const renderDifficultyRail = (className = "") => (
    <div className={`min-w-0 snap-x gap-2 overflow-x-auto pb-2 sm:gap-3 sm:pb-3 ${className}`}>
      {DIFFICULTY_ORDER.map((id) => {
        const active = difficulty === id;
        const unlocked = isDifficultyAvailable(progress, id);
        const label = DIFFICULTIES[id].label;
        return (
          <HapticButton
            key={id}
            type="button"
            onClick={() => changeDifficulty(id)}
            disabled={!unlocked}
            aria-label={
              unlocked
                ? `${label} chapter, level ${progress[id].highestUnlockedLevel}`
                : `${label} chapter locked`
            }
            className={`w-[7.25rem] shrink-0 snap-start rounded-[1.1rem] border px-3 py-2.5 text-left transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] sm:w-36 sm:rounded-[1.45rem] sm:py-3 sm:px-4 2xl:w-[10rem] ${
              active
                ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[inset_0_-3px_0_color-mix(in_oklch,var(--accent)_28%,transparent),0_8px_18px_var(--shadow-soft)]"
                : "border-[var(--panel-border)] bg-[var(--panel-muted)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_45%,transparent)] hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:bg-[var(--panel-bg)]"
            } ${!unlocked ? "cursor-not-allowed opacity-45" : ""}`}
          >
            <div className="flex items-center gap-2 text-[0.66rem] font-black uppercase tracking-[0.18em] text-[var(--text-muted)] sm:text-xs sm:tracking-[0.24em]">
              {!unlocked && <Lock className="h-3.5 w-3.5" />}
              {label}
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

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)] transition-colors duration-300">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(90deg,color-mix(in_oklch,var(--border)_38%,transparent)_1px,transparent_1px),linear-gradient(180deg,color-mix(in_oklch,var(--border)_38%,transparent)_1px,transparent_1px)] [background-size:42px_42px] sm:opacity-35" />
        <div className="absolute left-[-12%] top-16 hidden h-16 w-[72rem] rotate-[-7deg] bg-[var(--glow-secondary)] opacity-45 sm:block" />
        <div className="absolute bottom-20 right-[-14rem] hidden h-14 w-[52rem] rotate-[-14deg] bg-[var(--glow-primary)] opacity-55 sm:block" />
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-[92rem] flex-col px-1.5 pb-24 pt-1.5 sm:px-5 sm:pb-28 sm:pt-5 lg:px-8 lg:py-5">
        <section className="mx-auto flex w-full max-w-none flex-col">
          <div className="min-w-0 flex-1">
            <div className="puzzle-surface min-h-[calc(100vh-0.75rem)] overflow-hidden rounded-[1.35rem] border border-[var(--panel-border)] p-2.5 shadow-[0_24px_80px_var(--shadow-board)] backdrop-blur sm:min-h-[calc(100vh-2.5rem)] sm:rounded-[2rem] sm:p-4 xl:p-6">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:gap-4 sm:items-start">
                <div className="min-w-0">
                  <p className="truncate text-[0.68rem] font-black uppercase tracking-[0.28em] text-[var(--accent-strong)] sm:text-xs sm:tracking-[0.36em]">
                    Cross Multiply
                  </p>
                  <div className="mt-1 flex items-center gap-2 sm:hidden">
                    <span className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[var(--text-muted)]">
                      {difficultyConfig.label}
                    </span>
                    <span className="truncate rounded-full bg-[var(--accent-soft)] px-2.5 py-1 text-[0.62rem] font-black uppercase tracking-[0.16em] text-[var(--accent-strong)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--accent)_20%,transparent)]">
                      {puzzle.bandLabel}
                    </span>
                  </div>
                  <div className="mt-3 hidden flex-wrap items-center gap-3 sm:flex">
                    <span className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">
                      {puzzle.chapter}
                    </span>
                    <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[0.72rem] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--accent)_20%,transparent)]">
                      {puzzle.bandLabel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 sm:justify-end">
                  <IconActionButton
                    type="button"
                    onClick={useHint}
                    disabled={
                      hintStock <= 0 ||
                      session.status !== "playing" ||
                      !hintGateUnlocked
                    }
                    aria-label={
                      hintGateUnlocked
                        ? "Use hint"
                        : `Hints unlock after ${puzzle.hintGate?.unlockAfterCorrectMarks ?? 0} correct marks`
                    }
                  >
                    <Lightbulb className="h-5 w-5" strokeWidth={1.8} />
                    <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[var(--accent-pop)] px-1.5 py-0.5 text-[0.65rem] font-black leading-none text-[var(--fg)]">
                      {hintGateUnlocked ? hintStock : <Lock className="h-3 w-3" />}
                    </span>
                  </IconActionButton>
                  <IconActionButton
                    type="button"
                    onClick={() => generateLevel(difficulty, puzzle.level)}
                    aria-label="Build a new board for this level"
                  >
                    <RefreshCw className="h-5 w-5" strokeWidth={1.8} />
                  </IconActionButton>
                  <IconActionButton
                    type="button"
                    onClick={toggleTheme}
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

              <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-3 sm:mt-5 sm:gap-5 xl:mt-6 xl:grid-cols-[minmax(18rem,0.75fr)_minmax(30rem,1.25fr)] xl:items-end">
                <div className="min-w-0">
                  <p className="hidden text-sm font-black uppercase tracking-[0.26em] text-[var(--text-muted)] sm:block">
                    {difficultyConfig.label} Chapter
                  </p>
                  <div className="flex flex-wrap items-center gap-2 sm:mt-3 sm:items-end sm:gap-3">
                    <h1 className="game-number text-[2rem] font-black leading-none text-[var(--text-primary)] sm:text-6xl">
                      <span className="sm:hidden">Lv </span>
                      <span className="hidden sm:inline">Level </span>
                      {puzzle.level}
                    </h1>
                    <div className="rounded-full bg-[var(--lemon)] px-2.5 py-1 text-[0.7rem] font-black uppercase tracking-[0.16em] text-[var(--fg)] sm:px-3 sm:text-sm sm:tracking-[0.22em]">
                      {difficultyConfig.badge}
                    </div>
                  </div>
                  <div className="mt-2 hidden items-center gap-2 sm:flex">
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
                    <span className="text-sm text-[var(--text-secondary)]">
                      Best run on this level
                    </span>
                  </div>
                </div>

                {renderDifficultyRail("hidden sm:flex xl:justify-start")}
              </div>

              <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 sm:mt-5 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
                <div className="w-full min-w-0 overflow-hidden rounded-[1.35rem] border border-[var(--panel-border)] bg-[var(--board-shell)] p-2 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--surface)_55%,transparent),0_20px_44px_var(--shadow-board)] sm:rounded-[1.75rem] sm:p-4 lg:p-5">
                  <div className="mb-2 flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] sm:mb-4 sm:flex-wrap sm:gap-3 sm:overflow-visible sm:pb-0">
                    <Hearts hearts={session.hearts} maxHearts={session.maxHearts} />
                    {visibleBoardStatusPills.map((pill) => (
                      <StatusPill
                        key={pill.key}
                        icon={pill.icon}
                        tone={pill.tone}
                      >
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
                      onDismiss={dismissOnboarding}
                    />
                  )}

                  <div className="mx-auto w-full max-w-max overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]">
                    <div className="grid w-max" style={boardStyle}>
                      <div className="rounded-[1rem] border border-dashed border-[var(--panel-border)] bg-[var(--panel-muted)]/60 sm:rounded-[1.15rem]" />

                      {puzzle.colTargets.map((_, col) => {
                        const resolved = isColResolved(
                          puzzle,
                          session.marks,
                          col,
                        );
                        const progressValue = getColProgress(
                          puzzle,
                          session.marks,
                          col,
                        );
                        const target = getVisibleTarget(
                          puzzle,
                          session.marks,
                          "column",
                          col,
                        );
                        const ciphered =
                          target !== null &&
                          isTargetCiphered(puzzle, session.marks, "column");
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
                              ciphered && target !== null
                                ? getPrimeFactors(target)
                                : undefined
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

                      {Array.from({ length: size }, (_, row) => (
                        <RowFragment
                          key={`row-${row}`}
                          row={row}
                          puzzle={puzzle}
                          marks={session.marks}
                          focusKey={session.focusKey}
                          activeCommitment={session.activeCommitment}
                          noEchoLine={session.noEchoLine}
                          onPress={handleCellPress}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {renderDifficultyRail("flex sm:hidden")}

                <div className="space-y-3 lg:sticky lg:top-5 lg:max-h-[calc(100vh-2.5rem)] lg:overflow-y-auto lg:pr-1">
                  <div className="hidden lg:block">
                    <SidebarPanel title="Tools">
                      <div className="grid grid-cols-2 gap-3">
                        <ToolButton
                          active={session.mode === "erase"}
                          onClick={() => setMode("erase")}
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
                          onClick={() => setMode("select")}
                          disabled={session.toolLocked && session.mode !== "select"}
                          label="Select"
                          meta={
                            session.toolLocked && session.mode !== "select"
                              ? "Locked for now"
                              : undefined
                          }
                          icon={
                            <CheckCircle2 className="h-5 w-5" strokeWidth={1.8} />
                          }
                        />
                      </div>
                    </SidebarPanel>
                  </div>

                  <SidebarPanel
                    title="Rules"
                    meta={
                      puzzle.modifiers.length
                        ? `${puzzle.modifiers.length} active`
                        : "Classic"
                    }
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
                              onClick={() => dismissModifierTip(modifier.id)}
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
                          currentResult?.missionsCompleted.includes(mission.id) ??
                          false;

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
                              <div>
                                Next chapter: {DIFFICULTIES[nextLockedDifficulty].label}
                              </div>
                              <div>
                                {Math.min(
                                  nextUnlockProgress,
                                  nextUnlockRequirement,
                                )}
                                /{nextUnlockRequirement}{" "}
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
                            style={{
                              width: `${Math.min(
                                100,
                                (nextUnlockProgress / nextUnlockRequirement) *
                                  100,
                              )}%`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </SidebarPanel>
                </div>
              </div>
            </div>
          </div>
        </section>

        {session.status === "playing" && (
          <MobileToolDock
            mode={session.mode}
            onModeChange={setMode}
            toolLocked={session.toolLocked}
          />
        )}

        {(isPending || session.status !== "playing") && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none fixed inset-x-0 bottom-24 mx-auto flex w-fit max-w-[90vw] items-center gap-3 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 px-4 py-3 text-sm font-bold text-[var(--text-primary)] shadow-[0_18px_48px_var(--shadow-board)] backdrop-blur lg:bottom-4"
          >
            {isPending && <span>Building a fresh board...</span>}
            {!isPending && session.status === "won" && (
              <span>Level cleared. Review your stars and missions.</span>
            )}
            {!isPending && session.status === "lost" && (
              <span>Out of hearts. Retry this board or start a new layout.</span>
            )}
          </div>
        )}

        {session.status === "lost" && (
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
                  onClick={retryLevel}
                  className={secondaryActionClass}
                >
                  Retry board
                </HapticButton>
                <HapticButton
                  type="button"
                  onClick={rerollLevel}
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
                onClick={() => setUnlockDialogOpen(false)}
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

        {session.status === "won" && (
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
                  onClick={retryLevel}
                  className={secondaryActionClass}
                >
                  Replay same board
                </HapticButton>
                <HapticButton
                  type="button"
                  onClick={moveToNextLevel}
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
                        index < (getLevelResult(progress, difficulty, puzzle.level)?.stars ?? 0)
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
                      getLevelResult(progress, difficulty, puzzle.level)?.missionsCompleted.includes(
                        mission.id,
                      ) ?? false;

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
      </main>
    </div>
  );
}

export default App;
