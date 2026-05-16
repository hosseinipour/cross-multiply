import { useEffect, useRef, useState, useTransition } from "react";
import type { CSSProperties } from "react";
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

function App() {
  const [persisted, setPersisted] = useState<PersistedState>(() =>
    loadPersistedState(),
  );
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const themeToggleTimes = useRef<number[]>([]);

  const { difficulty, dismissedModifierTips, hintStock, progress, session, theme } = persisted;
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

  const boardStyle = {
    gridTemplateColumns: `repeat(${size + 1}, minmax(0, 1fr))`,
    gridTemplateRows: `repeat(${size + 1}, minmax(0, 1fr))`,
  } satisfies CSSProperties;

  return (
    <div className="min-h-screen bg-[var(--app-bg)] text-[var(--text-primary)] transition-colors duration-300">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(90deg,color-mix(in_oklch,var(--border)_45%,transparent)_1px,transparent_1px),linear-gradient(180deg,color-mix(in_oklch,var(--border)_45%,transparent)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="absolute left-[-12%] top-16 h-24 w-[78rem] rotate-[-7deg] bg-[var(--glow-secondary)] opacity-70" />
        <div className="absolute bottom-20 right-[-14rem] h-20 w-[56rem] rotate-[-14deg] bg-[var(--glow-primary)] opacity-80" />
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-0 pb-0 pt-0 sm:px-5 sm:pb-8 sm:pt-5 lg:px-8">
        <section className="mx-auto flex w-full max-w-none flex-col gap-6 xl:flex-row xl:items-start">
          <div className="min-w-0 flex-1">
            <div className="puzzle-surface min-h-screen rounded-none border-y border-[var(--panel-border)] p-3 shadow-[0_24px_80px_var(--shadow-board)] backdrop-blur sm:min-h-0 sm:rounded-[2rem] sm:border sm:p-4 xl:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.36em] text-[var(--accent-strong)]">
                    Cross Multiply
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]">
                      {puzzle.chapter}
                    </span>
                    <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[0.72rem] font-black uppercase tracking-[0.22em] text-[var(--accent-strong)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--accent)_20%,transparent)]">
                      {puzzle.bandLabel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <HapticButton
                    type="button"
                    onClick={useHint}
                    disabled={
                      hintStock <= 0 ||
                      session.status !== "playing" ||
                      !hintGateUnlocked
                    }
                    className="relative rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] p-3 text-[var(--text-primary)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_45%,transparent)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50"
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
                  </HapticButton>
                  <HapticButton
                    type="button"
                    onClick={() => generateLevel(difficulty, puzzle.level)}
                    className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] p-3 text-[var(--text-primary)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_45%,transparent)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)]"
                    aria-label="Generate a fresh puzzle"
                  >
                    <RefreshCw className="h-5 w-5" strokeWidth={1.8} />
                  </HapticButton>
                  <HapticButton
                    type="button"
                    onClick={toggleTheme}
                    className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] p-3 text-[var(--text-primary)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_45%,transparent)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)]"
                    aria-label="Toggle theme"
                  >
                    {theme === "dark" ? (
                      <Sun className="h-5 w-5" strokeWidth={1.8} />
                    ) : (
                      <Moon className="h-5 w-5" strokeWidth={1.8} />
                    )}
                  </HapticButton>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-5 xl:mt-6 xl:flex-row xl:items-start xl:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.26em] text-[var(--text-muted)]">
                    {difficultyConfig.label} Chapter
                  </p>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <h1 className="game-number text-5xl font-black tracking-tight text-[var(--text-primary)] sm:text-6xl">
                      Level {puzzle.level}
                    </h1>
                    <div className="rounded-full bg-[var(--lemon)] px-3 py-1 text-sm font-black uppercase tracking-[0.22em] text-[var(--fg)]">
                      {difficultyConfig.badge}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
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

                <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-4 xl:-mx-1 xl:px-1">
                  {DIFFICULTY_ORDER.map((id) => {
                    const active = difficulty === id;
                    const unlocked = isDifficultyAvailable(progress, id);
                    return (
                      <HapticButton
                        key={id}
                        type="button"
                        onClick={() => changeDifficulty(id)}
                        disabled={!unlocked}
                        className={`shrink-0 rounded-[1.45rem] border px-3 py-3 text-left transition duration-200 sm:px-4 ${
                          active
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[inset_0_-3px_0_color-mix(in_oklch,var(--accent)_28%,transparent),0_8px_18px_var(--shadow-soft)]"
                            : "border-[var(--panel-border)] bg-[var(--panel-muted)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_45%,transparent)] hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:bg-[var(--panel-bg)]"
                        } ${!unlocked ? "cursor-not-allowed opacity-45" : ""}`}
                      >
                        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">
                          {!unlocked && <Lock className="h-3.5 w-3.5" />}
                          {DIFFICULTIES[id].label}
                        </div>
                        <div className="game-number mt-2 text-lg font-black text-[var(--text-primary)]">
                          Lv {progress[id].highestUnlockedLevel}
                        </div>
                        <div className="mt-1 text-xs text-[var(--text-secondary)]">
                          {progress[id].clearedLevels} cleared
                        </div>
                      </HapticButton>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_21rem]">
                <div className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--board-shell)] p-2 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--surface)_55%,transparent),0_20px_44px_var(--shadow-board)] sm:p-4">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <Hearts hearts={session.hearts} maxHearts={session.maxHearts} />
                    <div className="inline-flex items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[var(--text-secondary)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_35%,transparent)]">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Correct {correctMarks}
                    </div>
                    {puzzle.hintGate && !hintGateUnlocked && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--lemon)]/45 bg-[color-mix(in_oklch,var(--lemon)_22%,transparent)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">
                        <Lightbulb className="h-3.5 w-3.5" />
                        Hints {correctMarks}/{puzzle.hintGate.unlockAfterCorrectMarks}
                      </div>
                    )}
                    {sealedProgress && !sealedProgress.unlocked && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--sky)]/35 bg-[color-mix(in_oklch,var(--sky)_16%,transparent)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[var(--sky)]">
                        <Lock className="h-3.5 w-3.5" />
                        Seals {sealedProgress.current}/{sealedProgress.required}
                      </div>
                    )}
                    {cloakedProgress && !cloakedProgress.unlocked && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--berry)]/35 bg-[color-mix(in_oklch,var(--berry)_16%,transparent)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[var(--berry)]">
                        <Sparkles className="h-3.5 w-3.5" />
                        Cloaks {cloakedProgress.current}/{cloakedProgress.required}
                      </div>
                    )}
                    {spotlightProgress && !spotlightProgress.complete && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--lemon)]/45 bg-[color-mix(in_oklch,var(--lemon)_24%,transparent)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">
                        <Sparkles className="h-3.5 w-3.5" />
                        Spotlight {spotlightProgress.axis} {spotlightProgress.index + 1}:{" "}
                        {spotlightProgress.current}/{spotlightProgress.required}
                      </div>
                    )}
                    {session.toolLocked && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--lemon)]/45 bg-[color-mix(in_oklch,var(--lemon)_22%,transparent)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[var(--text-primary)]">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Start in select. Switch unlocks after matching a visible target
                      </div>
                    )}
                    {session.activeCommitment && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--sky)]/35 bg-[color-mix(in_oklch,var(--sky)_16%,transparent)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[var(--sky)]">
                        <Lock className="h-3.5 w-3.5" />
                        Locked to {session.activeCommitment.axis} {session.activeCommitment.index + 1}
                      </div>
                    )}
                    {session.noEchoLine && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--danger)]/35 bg-[color-mix(in_oklch,var(--danger)_16%,transparent)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[var(--danger)]">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Next off {session.noEchoLine.axis} {session.noEchoLine.index + 1}
                      </div>
                    )}
                    {puzzle.crossBlind && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--berry)]/35 bg-[color-mix(in_oklch,var(--berry)_16%,transparent)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[var(--berry)]">
                        <Sparkles className="h-3.5 w-3.5" />
                        {puzzle.crossBlind.hiddenAxis} axis blind:{" "}
                        {countMatchedTargetsOnAxis(
                          puzzle,
                          session.marks,
                          puzzle.crossBlind.hiddenAxis === "row" ? "column" : "row",
                        )}
                        /{puzzle.crossBlind.unlockAfterMatchedVisibleLines}
                      </div>
                    )}
                    {factorCipherProgress && !factorCipherProgress.unlocked && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/35 bg-[var(--accent-soft)] px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">
                        <Sparkles className="h-3.5 w-3.5" />
                        Cipher {factorCipherProgress.current}/{factorCipherProgress.required}
                      </div>
                    )}
                  </div>

                  <div className="mx-auto w-full max-w-3xl">
                    <div className="grid gap-1.5 sm:gap-3" style={boardStyle}>
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

                <div className="space-y-4">
                  <div className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--surface)_55%,transparent)]">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">
                      Tools
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <ToolButton
                        active={session.mode === "erase"}
                        onClick={() => setMode("erase")}
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
                        onClick={() => setMode("select")}
                        disabled={session.toolLocked && session.mode !== "select"}
                        label="Select"
                        meta={
                          session.toolLocked && session.mode !== "select"
                            ? "Locked"
                            : undefined
                        }
                        icon={
                          <CheckCircle2 className="h-5 w-5" strokeWidth={1.8} />
                        }
                      />
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--surface)_55%,transparent)]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">
                        Modifier Stack
                      </p>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {puzzle.modifiers.length || "Classic"}
                      </span>
                    </div>
                    <div className="mt-3 space-y-3">
                      {puzzle.modifiers.length === 0 && (
                        <div className="rounded-[1.2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_35%,transparent)]">
                          Classic training board. No extra rules yet.
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
                              className="rounded-full border border-[var(--sky)]/25 bg-[var(--panel-bg)]/55 p-1 text-[var(--sky)] transition hover:bg-[var(--panel-bg)]"
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
                      {puzzle.modifiers.map((modifier) => (
                        <div
                          key={modifier.id}
                          className="rounded-[1.2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_35%,transparent)]"
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-[var(--accent)]" />
                            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                              {modifier.title}
                            </h2>
                          </div>
                          <p className="mt-2 text-sm text-[var(--text-secondary)]">
                            {modifier.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--surface)_55%,transparent)]">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">
                        Missions
                      </p>
                      <span className="text-xs text-[var(--text-secondary)]">
                        Optional
                      </span>
                    </div>
                    <div className="mt-3 space-y-3">
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
                  </div>

                  <div className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--surface)_55%,transparent)]">
                    <p className="text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">
                      Chapter Progress
                    </p>
                    <div className="mt-3 rounded-[1.2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-4 shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_35%,transparent)]">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="game-number text-lg font-black text-[var(--text-primary)]">
                            {progress[difficulty].clearedLevels} levels cleared
                          </div>
                          <div className="mt-1 text-sm text-[var(--text-secondary)]">
                            Highest unlocked: Level {progress[difficulty].highestUnlockedLevel}
                          </div>
                        </div>
                        <div className="text-right text-sm text-[var(--text-secondary)]">
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
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {(isPending || session.status !== "playing") && (
          <div className="pointer-events-none fixed inset-x-0 bottom-4 mx-auto flex w-fit max-w-[90vw] items-center gap-3 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 px-4 py-3 text-sm font-bold text-[var(--text-primary)] shadow-[0_18px_48px_var(--shadow-board)] backdrop-blur">
            {isPending && <span>Generating a fresh challenge board...</span>}
            {!isPending && session.status === "won" && (
              <span>Clean solve. Your reward summary is ready.</span>
            )}
            {!isPending && session.status === "lost" && (
              <span>Out of hearts. Retry this board or roll a fresh layout.</span>
            )}
          </div>
        )}

        {session.status === "lost" && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[oklch(15%_0.02_230/0.5)] p-4 backdrop-blur-sm">
            <div className="dialog-surface w-full max-w-sm rounded-[2rem] border border-[var(--panel-border)] p-6 text-center shadow-[0_24px_80px_var(--shadow-board)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--danger)]/35 bg-[color-mix(in_oklch,var(--danger)_16%,transparent)] text-[var(--danger)]">
                <Heart className="h-6 w-6 fill-current" strokeWidth={1.8} />
              </div>
              <h2 className="mt-4 text-3xl font-black text-[var(--text-primary)]">
                Out of hearts
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                This chapter uses pressure as part of the puzzle. Reset and try a cleaner line.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <HapticButton
                  type="button"
                  onClick={retryLevel}
                  className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-3 text-sm font-black text-[var(--text-primary)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_45%,transparent)] transition hover:-translate-y-0.5"
                >
                  Retry
                </HapticButton>
                <HapticButton
                  type="button"
                  onClick={rerollLevel}
                  className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-[var(--cell-highlight-text)] shadow-[0_12px_30px_var(--glow-primary)] transition hover:-translate-y-0.5"
                >
                  New board
                </HapticButton>
              </div>
            </div>
          </div>
        )}

        {unlockDialogOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[oklch(15%_0.02_230/0.5)] p-4 backdrop-blur-sm">
            <div className="dialog-surface w-full max-w-sm rounded-[2rem] border border-[var(--panel-border)] p-6 text-center shadow-[0_24px_80px_var(--shadow-board)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--lemon)]/50 bg-[color-mix(in_oklch,var(--lemon)_30%,transparent)] text-[var(--text-primary)]">
                <Sparkles className="h-6 w-6" strokeWidth={1.8} />
              </div>
              <h2 className="mt-4 text-3xl font-black text-[var(--text-primary)]">
                All chapters unlocked
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                The hidden gate opened. Medium, Hard, Expert, and Mythic are ready.
              </p>
              <HapticButton
                type="button"
                onClick={() => setUnlockDialogOpen(false)}
                className="mt-6 w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-[var(--cell-highlight-text)] shadow-[0_12px_30px_var(--glow-primary)] transition hover:-translate-y-0.5"
              >
                Nice
              </HapticButton>
            </div>
          </div>
        )}

        {session.status === "won" && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-[oklch(15%_0.02_230/0.5)] p-4 backdrop-blur-sm">
            <div className="dialog-surface w-full max-w-lg rounded-[2rem] border border-[var(--panel-border)] p-6 shadow-[0_24px_80px_var(--shadow-board)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--success)]/35 bg-[color-mix(in_oklch,var(--success)_18%,transparent)] text-[var(--success)]">
                <CheckCircle2 className="h-6 w-6" strokeWidth={1.8} />
              </div>
              <h2 className="mt-4 text-center text-3xl font-black text-[var(--text-primary)]">
                Level cleared
              </h2>
              <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
                {puzzle.chapter} rewards clean solves and disciplined clue use.
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
                  <div className="rounded-[1.2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-2.5 text-center shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_35%,transparent)] sm:px-4 sm:py-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)] sm:text-xs sm:tracking-[0.22em]">
                      Hearts
                    </div>
                    <div className="game-number mt-1.5 text-xl font-black text-[var(--text-primary)] sm:mt-2 sm:text-2xl">
                      {session.hearts}/{session.maxHearts}
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-2.5 text-center shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_35%,transparent)] sm:px-4 sm:py-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)] sm:text-xs sm:tracking-[0.22em]">
                      Hints
                    </div>
                    <div className="game-number mt-1.5 text-xl font-black text-[var(--text-primary)] sm:mt-2 sm:text-2xl">
                      {session.hintsUsed}
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-2.5 text-center shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_35%,transparent)] sm:px-4 sm:py-3">
                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)] sm:text-xs sm:tracking-[0.22em]">
                      Mistakes
                    </div>
                    <div className="game-number mt-1.5 text-xl font-black text-[var(--text-primary)] sm:mt-2 sm:text-2xl">
                      {session.mistakes}
                    </div>
                  </div>
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

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <HapticButton
                  type="button"
                  onClick={retryLevel}
                  className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-3 text-sm font-black text-[var(--text-primary)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_45%,transparent)] transition hover:-translate-y-0.5"
                >
                  Replay same board
                </HapticButton>
                <HapticButton
                  type="button"
                  onClick={moveToNextLevel}
                  className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-black text-[var(--cell-highlight-text)] shadow-[0_12px_30px_var(--glow-primary)] transition hover:-translate-y-0.5"
                >
                  Next level
                </HapticButton>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
