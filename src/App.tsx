import { useEffect, useState, useTransition } from "react";
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
} from "lucide-react";
import {
  applyRevealedMarks,
  areAllRowTargetsMet,
  createEmptyMarks,
  createPuzzle,
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  getColProgress,
  getCorrectMarkCount,
  getVisibleTarget,
  isColResolved,
  isPuzzleSolved,
  revealHint,
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
  const initialToolLock =
    Boolean(puzzle.initialMode && puzzle.toolUnlockCorrectMarks) &&
    getCorrectMarkCount(puzzle, marks) < (puzzle.toolUnlockCorrectMarks ?? 0);

  return {
    puzzle,
    marks,
    hearts: puzzle.maxHearts,
    maxHearts: puzzle.maxHearts,
    mode: puzzle.initialMode ?? "select",
    status: "playing",
    focusKey: null,
    hintsUsed: 0,
    mistakes: 0,
    eraseUsedBeforeRowsResolved: false,
    toolLocked: initialToolLock,
  };
}

function getNextDifficulty(difficulty: DifficultyId) {
  const index = DIFFICULTY_ORDER.indexOf(difficulty);
  return DIFFICULTY_ORDER[index + 1] ?? null;
}

function isDifficultyAvailable(progress: ProgressState, difficulty: DifficultyId) {
  const index = DIFFICULTY_ORDER.indexOf(difficulty);

  if (index <= 0) {
    return true;
  }

  const previous = DIFFICULTY_ORDER[index - 1];
  return (
    progress[previous].clearedLevels >= getDifficultyUnlockRequirement(difficulty)
  );
}

function loadPersistedState(): PersistedState {
  const progress = createProgressState();
  const fallback: PersistedState = {
    theme: "dark",
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

function computeStars(puzzle: Puzzle, run: RunSummary) {
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

  const hasHintTax = puzzle.modifiers.some(
    (modifier) => modifier.id === "comboHintPenalty",
  );

  if (hasHintTax && run.hintsUsed >= 2) {
    stars = Math.min(stars, 1);
  } else if (hasHintTax && run.hintsUsed === 1) {
    stars = Math.min(stars, 2);
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
  if (!current || !puzzle.toolUnlockCorrectMarks) {
    return false;
  }

  return getCorrectMarkCount(puzzle, marks) < puzzle.toolUnlockCorrectMarks;
}

function App() {
  const [persisted, setPersisted] = useState<PersistedState>(() =>
    loadPersistedState(),
  );
  const [isPending, startTransition] = useTransition();

  const { difficulty, hintStock, progress, session, theme } = persisted;
  const puzzle = session.puzzle;
  const size = puzzle.size;
  const difficultyConfig = DIFFICULTIES[difficulty];
  const currentResult = getLevelResult(progress, difficulty, puzzle.level);
  const nextDifficulty = getNextDifficulty(difficulty);
  const nextUnlockRequirement = nextDifficulty
    ? getDifficultyUnlockRequirement(nextDifficulty)
    : 0;

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
      },
    }));
  };

  const handleCellPress = (row: number, col: number) => {
    if (session.status !== "playing" || session.marks[row][col] !== "hidden") {
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
    if (session.status !== "playing" || hintStock <= 0) {
      return;
    }

    const hint = revealHint(puzzle, session.marks);

    if (!hint) {
      return;
    }

    const nextMarks = session.marks.map((line) => [...line]);
    nextMarks[hint.row][hint.col] = hint.mark;
    const solved = isPuzzleSolved(puzzle, nextMarks);
    const nextToolLocked = getToolLockState(puzzle, nextMarks, session.toolLocked);

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
        <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-[var(--glow-primary)] blur-3xl" />
        <div className="absolute right-[-4rem] top-1/3 h-80 w-80 rounded-full bg-[var(--glow-secondary)] blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-56 bg-[radial-gradient(circle_at_bottom,rgba(255,255,255,0.12),transparent_62%)]" />
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-0 pb-0 pt-0 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8">
        <section className="mx-auto flex w-full max-w-none flex-col gap-6 xl:flex-row xl:items-start">
          <div className="min-w-0 flex-1">
            <div className="min-h-screen rounded-none border-y border-[var(--panel-border)] bg-[var(--panel-bg)]/95 p-3 shadow-[0_24px_80px_rgba(6,10,24,0.35)] backdrop-blur sm:min-h-0 sm:rounded-[2rem] sm:border sm:p-4 xl:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.42em] text-[var(--text-muted)]">
                    Cross Multiply
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <span className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] px-3 py-1 text-[0.7rem] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                      {puzzle.chapter}
                    </span>
                    <span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-[0.72rem] uppercase tracking-[0.25em] text-[var(--accent-strong)]">
                      {puzzle.bandLabel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <HapticButton
                    type="button"
                    onClick={useHint}
                    disabled={hintStock <= 0 || session.status !== "playing"}
                    className="relative rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] p-3 text-[var(--text-primary)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Use hint"
                  >
                    <Lightbulb className="h-5 w-5" strokeWidth={1.8} />
                    <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-[var(--accent)] px-1.5 py-0.5 text-[0.65rem] font-semibold leading-none text-white">
                      {hintStock}
                    </span>
                  </HapticButton>
                  <HapticButton
                    type="button"
                    onClick={() => generateLevel(difficulty, puzzle.level)}
                    className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] p-3 text-[var(--text-primary)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]"
                    aria-label="Generate a fresh puzzle"
                  >
                    <RefreshCw className="h-5 w-5" strokeWidth={1.8} />
                  </HapticButton>
                  <HapticButton
                    type="button"
                    onClick={() =>
                      setTheme(theme === "dark" ? "light" : "dark")
                    }
                    className="rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] p-3 text-[var(--text-primary)] transition hover:-translate-y-0.5 hover:border-[var(--accent)]/40 hover:bg-[var(--accent-soft)]"
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
                  <p className="text-sm uppercase tracking-[0.35em] text-[var(--text-muted)]">
                    {difficultyConfig.label} Chapter
                  </p>
                  <div className="mt-3 flex flex-wrap items-end gap-3">
                    <h1 className="font-['Georgia'] text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:text-5xl">
                      Level {puzzle.level}
                    </h1>
                    <div className="pb-1 text-sm uppercase tracking-[0.3em] text-[var(--text-muted)]">
                      {difficultyConfig.badge}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    {Array.from({ length: 3 }, (_, index) => (
                      <Star
                        key={index}
                        className={`h-5 w-5 ${
                          index < (currentResult?.stars ?? 0)
                            ? "fill-amber-300 text-amber-300"
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
                        className={`shrink-0 rounded-[1.4rem] border px-3 py-3 text-left transition sm:px-4 ${
                          active
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_6px_18px_rgba(247,122,168,0.16)]"
                            : "border-[var(--panel-border)] bg-[var(--panel-muted)] hover:border-[var(--accent)]/30 hover:bg-[var(--panel-bg)]"
                        } ${!unlocked ? "cursor-not-allowed opacity-45" : ""}`}
                      >
                        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                          {!unlocked && <Lock className="h-3.5 w-3.5" />}
                          {DIFFICULTIES[id].label}
                        </div>
                        <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">
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
                <div className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--board-shell)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-4">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <Hearts hearts={session.hearts} maxHearts={session.maxHearts} />
                    {session.toolLocked && (
                      <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/18 bg-amber-400/10 px-3 py-1.5 text-xs uppercase tracking-[0.24em] text-amber-200">
                        <ShieldAlert className="h-3.5 w-3.5" />
                        Unlock second tool after {puzzle.toolUnlockCorrectMarks} correct marks
                      </div>
                    )}
                  </div>

                  <div className="mx-auto w-full max-w-3xl">
                    <div className="grid gap-1.5 sm:gap-3" style={boardStyle}>
                      <div className="rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--panel-muted)]/60" />

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
                        return (
                          <RowFragment.ColumnTarget
                            key={`col-${col}`}
                            target={getVisibleTarget(
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
                          onPress={handleCellPress}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
                    <p className="text-xs uppercase tracking-[0.34em] text-[var(--text-muted)]">
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

                  <div className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.34em] text-[var(--text-muted)]">
                        Modifier Stack
                      </p>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {puzzle.modifiers.length || "Classic"}
                      </span>
                    </div>
                    <div className="mt-3 space-y-3">
                      {puzzle.modifiers.length === 0 && (
                        <div className="rounded-[1.2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-sm text-[var(--text-secondary)]">
                          Classic training board. No extra rules yet.
                        </div>
                      )}
                      {puzzle.modifiers.map((modifier) => (
                        <div
                          key={modifier.id}
                          className="rounded-[1.2rem] border border-[var(--panel-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent)] px-4 py-3"
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

                  <div className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.34em] text-[var(--text-muted)]">
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
                                ? "border-emerald-300/25 bg-emerald-500/10"
                                : "border-[var(--panel-border)] bg-[var(--panel-bg)]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                                {mission.title}
                              </h2>
                              {completed && (
                                <CheckCircle2
                                  className="h-4 w-4 text-emerald-300"
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

                  <div className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] p-4">
                    <p className="text-xs uppercase tracking-[0.34em] text-[var(--text-muted)]">
                      Chapter Progress
                    </p>
                    <div className="mt-3 rounded-[1.2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <div className="text-lg font-semibold text-[var(--text-primary)]">
                            {progress[difficulty].clearedLevels} levels cleared
                          </div>
                          <div className="mt-1 text-sm text-[var(--text-secondary)]">
                            Highest unlocked: Level {progress[difficulty].highestUnlockedLevel}
                          </div>
                        </div>
                        <div className="text-right text-sm text-[var(--text-secondary)]">
                          {nextDifficulty ? (
                            <>
                              <div>Next chapter: {DIFFICULTIES[nextDifficulty].label}</div>
                              <div>
                                {Math.min(
                                  progress[difficulty].clearedLevels,
                                  nextUnlockRequirement,
                                )}
                                /{nextUnlockRequirement} clears
                              </div>
                            </>
                          ) : (
                            <div>Final chapter unlocked</div>
                          )}
                        </div>
                      </div>
                      {nextDifficulty && (
                        <div className="mt-4 h-2 rounded-full bg-black/15">
                          <div
                            className="h-full rounded-full bg-[var(--accent)]"
                            style={{
                              width: `${Math.min(
                                100,
                                (progress[difficulty].clearedLevels /
                                  nextUnlockRequirement) *
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
          <div className="pointer-events-none fixed inset-x-0 bottom-4 mx-auto flex w-fit max-w-[90vw] items-center gap-3 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 px-4 py-3 text-sm text-[var(--text-primary)] shadow-[0_18px_48px_rgba(0,0,0,0.25)] backdrop-blur">
            {isPending && <span>Generating a fresh challenge board...</span>}
            {!isPending && session.status === "won" && (
              <span>Chapter cleared. Your reward summary is ready.</span>
            )}
            {!isPending && session.status === "lost" && (
              <span>Out of hearts. Retry this board or roll a fresh layout.</span>
            )}
          </div>
        )}

        {session.status === "lost" && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-rose-400/25 bg-rose-500/12 text-rose-400">
                <Heart className="h-6 w-6 fill-current" strokeWidth={1.8} />
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
                You lost
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                This chapter uses pressure as part of the puzzle. Reset and try a cleaner line.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <HapticButton
                  type="button"
                  onClick={retryLevel}
                  className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:-translate-y-0.5"
                >
                  Retry
                </HapticButton>
                <HapticButton
                  type="button"
                  onClick={rerollLevel}
                  className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(247,122,168,0.3)] transition hover:-translate-y-0.5"
                >
                  New board
                </HapticButton>
              </div>
            </div>
          </div>
        )}

        {session.status === "won" && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-[2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/12 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" strokeWidth={1.8} />
              </div>
              <h2 className="mt-4 text-center text-2xl font-semibold text-[var(--text-primary)]">
                Level cleared
              </h2>
              <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
                {puzzle.chapter} rewards clean solves and disciplined clue use.
              </p>

              <div className="mt-6 rounded-[1.5rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] p-5">
                <div className="flex items-center justify-center gap-2">
                  {Array.from({ length: 3 }, (_, index) => (
                    <Star
                      key={index}
                      className={`h-7 w-7 ${
                        index < (getLevelResult(progress, difficulty, puzzle.level)?.stars ?? 0)
                          ? "fill-amber-300 text-amber-300"
                          : "text-[var(--panel-border)]"
                      }`}
                      strokeWidth={1.8}
                    />
                  ))}
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-[1.2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-center">
                    <div className="text-xs uppercase tracking-[0.26em] text-[var(--text-muted)]">
                      Hearts
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                      {session.hearts}/{session.maxHearts}
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-center">
                    <div className="text-xs uppercase tracking-[0.26em] text-[var(--text-muted)]">
                      Hints
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
                      {session.hintsUsed}
                    </div>
                  </div>
                  <div className="rounded-[1.2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-4 py-3 text-center">
                    <div className="text-xs uppercase tracking-[0.26em] text-[var(--text-muted)]">
                      Mistakes
                    </div>
                    <div className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">
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
                            ? "border-emerald-300/25 bg-emerald-500/10"
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
                            className="h-5 w-5 text-emerald-300"
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
                  className="rounded-2xl border border-[var(--panel-border)] bg-[var(--panel-muted)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:-translate-y-0.5"
                >
                  Replay same board
                </HapticButton>
                <HapticButton
                  type="button"
                  onClick={moveToNextLevel}
                  className="rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(247,122,168,0.3)] transition hover:-translate-y-0.5"
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
