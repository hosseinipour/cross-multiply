import {
  applyRevealedMarks,
  createEmptyMarks,
  createPuzzle,
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  hasVisibleMatchedTarget,
  type ActiveCommitment,
  type CellMark,
  type DifficultyId,
  type Puzzle,
  type ToolMode,
} from "./game";
import {
  MISSION_DETAILS,
  getDifficultyUnlockRequirement,
  getDifficultyUnlockSource,
  type MissionId,
  type ModifierId,
} from "./progression";

export type ThemeMode = "dark" | "light";
export type GameStatus = "playing" | "won" | "lost";

export type RunSummary = {
  heartsLeft: number;
  maxHearts: number;
  hintsUsed: number;
  mistakes: number;
};

export type WinOptions = {
  runOverrides?: Partial<RunSummary>;
  consumeHint?: boolean;
};

export type LevelResult = {
  stars: number;
  missionsCompleted: MissionId[];
  bestRun: RunSummary;
};

export type DifficultyProgress = {
  highestUnlockedLevel: number;
  clearedLevels: number;
  levelResults: Record<string, LevelResult>;
};

export type ProgressState = Record<DifficultyId, DifficultyProgress>;

export type SessionState = {
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

export type PersistedState = {
  theme: ThemeMode;
  difficulty: DifficultyId;
  hintStock: number;
  session: SessionState;
  progress: ProgressState;
  dismissedModifierTips: Partial<Record<ModifierId, boolean>>;
  onboardingDismissed: boolean;
};

export const STORAGE_KEY = "cross-multiply-state-v2";
export const LEGACY_STORAGE_KEY = "cross-multiply-state";
export const STARTING_HINTS = 3;
export const MAX_HINT_STOCK = 10;

const MAX_PROGRESS_LEVEL = 10000;
const MISSION_IDS = Object.keys(MISSION_DETAILS) as MissionId[];

export function createProgressState(): ProgressState {
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

export function buildSession(
  difficulty: DifficultyId,
  level: number,
): SessionState {
  const puzzle = createPuzzle(level, difficulty);
  return buildSessionFromPuzzle(puzzle);
}

export function buildSessionFromPuzzle(puzzle: Puzzle): SessionState {
  const marks = applyRevealedMarks(
    createEmptyMarks(puzzle.size),
    puzzle.revealedMarks,
  );

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clampInteger(
  value: unknown,
  fallback: number,
  min: number,
  max = MAX_PROGRESS_LEVEL,
) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(parsed)));
}

function sanitizeRunSummary(value: unknown): RunSummary {
  const run = isRecord(value) ? value : {};
  const maxHearts = clampInteger(run.maxHearts, 3, 1, 99);

  return {
    heartsLeft: clampInteger(run.heartsLeft, maxHearts, 0, maxHearts),
    maxHearts,
    hintsUsed: clampInteger(run.hintsUsed, 0, 0, MAX_PROGRESS_LEVEL),
    mistakes: clampInteger(run.mistakes, 0, 0, MAX_PROGRESS_LEVEL),
  };
}

function sanitizeLevelResult(value: unknown): LevelResult | null {
  if (!isRecord(value)) {
    return null;
  }

  const missionsCompleted = Array.isArray(value.missionsCompleted)
    ? Array.from(
        new Set(
          value.missionsCompleted.filter(
            (mission): mission is MissionId =>
              typeof mission === "string" &&
              MISSION_IDS.includes(mission as MissionId),
          ),
        ),
      )
    : [];

  return {
    stars: clampInteger(value.stars, 1, 1, 3),
    missionsCompleted,
    bestRun: sanitizeRunSummary(value.bestRun),
  };
}

function sanitizeProgressState(
  progressValue: unknown,
  legacyUnlockedValue: unknown,
): ProgressState {
  const nextProgress = createProgressState();
  const progressRecord = isRecord(progressValue) ? progressValue : null;
  const legacyUnlocked = isRecord(legacyUnlockedValue)
    ? legacyUnlockedValue
    : null;

  for (const id of DIFFICULTY_ORDER) {
    const entry =
      progressRecord && isRecord(progressRecord[id])
        ? progressRecord[id]
        : null;

    const levelResultsRecord =
      entry && isRecord(entry.levelResults) ? entry.levelResults : null;
    const levelResults: Record<string, LevelResult> = {};

    if (levelResultsRecord) {
      for (const [levelKey, rawResult] of Object.entries(levelResultsRecord)) {
        const level = clampInteger(levelKey, 0, 1);
        const result = sanitizeLevelResult(rawResult);

        if (level > 0 && result) {
          levelResults[String(level)] = result;
        }
      }
    }

    const completedCount = Object.keys(levelResults).length;
    const legacyHighest = legacyUnlocked
      ? clampInteger(legacyUnlocked[id], 1, 1)
      : 1;
    const clearedLevels = entry
      ? Math.max(
          clampInteger(entry.clearedLevels, completedCount, 0),
          completedCount,
        )
      : 0;
    const highestUnlockedLevel = entry
      ? clampInteger(
          entry.highestUnlockedLevel,
          Math.max(1, clearedLevels + 1, legacyHighest),
          1,
        )
      : legacyHighest;

    nextProgress[id] = {
      clearedLevels,
      highestUnlockedLevel: Math.max(highestUnlockedLevel, clearedLevels + 1),
      levelResults,
    };
  }

  return nextProgress;
}

export function isDifficultyAvailable(
  progress: ProgressState,
  difficulty: DifficultyId,
) {
  const unlockSource = getDifficultyUnlockSource(difficulty);

  if (!unlockSource) {
    return true;
  }

  return (
    progress[unlockSource].clearedLevels >=
    getDifficultyUnlockRequirement(difficulty)
  );
}

export function getNextLockedDifficulty(progress: ProgressState) {
  return (
    DIFFICULTY_ORDER.find((id) => !isDifficultyAvailable(progress, id)) ?? null
  );
}

export function unlockAllDifficulties(
  progress: ProgressState,
): ProgressState {
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

export function loadPersistedState(): PersistedState {
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

    const nextProgress = sanitizeProgressState(parsed.progress, parsed.unlocked);

    const preferredDifficulty =
      parsed.difficulty && parsed.difficulty in DIFFICULTIES
        ? parsed.difficulty
        : "easy";
    const difficulty = isDifficultyAvailable(nextProgress, preferredDifficulty)
      ? preferredDifficulty
      : "easy";
    const level = clampInteger(
      parsed.session?.puzzle?.level ??
        nextProgress[difficulty].highestUnlockedLevel ??
        1,
      nextProgress[difficulty].highestUnlockedLevel,
      1,
      nextProgress[difficulty].highestUnlockedLevel,
    );

    return {
      theme: parsed.theme === "dark" ? "dark" : "light",
      difficulty,
      hintStock:
        typeof parsed.hintStock === "number"
          ? Math.max(0, Math.min(MAX_HINT_STOCK, parsed.hintStock))
          : STARTING_HINTS,
      progress: nextProgress,
      session: buildSession(difficulty, level),
      dismissedModifierTips: parsed.dismissedModifierTips ?? {},
      onboardingDismissed: Boolean(parsed.onboardingDismissed),
    };
  } catch {
    return fallback;
  }
}

export function getLevelResult(
  progress: ProgressState,
  difficulty: DifficultyId,
  level: number,
) {
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

export function applyWinResult(
  current: PersistedState,
  nextMarks: CellMark[][],
  options?: WinOptions,
): PersistedState {
  const currentSession = current.session;
  const currentPuzzle = currentSession.puzzle;
  const currentDifficulty = current.difficulty;
  const run: RunSummary = {
    heartsLeft: options?.runOverrides?.heartsLeft ?? currentSession.hearts,
    maxHearts: options?.runOverrides?.maxHearts ?? currentSession.maxHearts,
    hintsUsed: options?.runOverrides?.hintsUsed ?? currentSession.hintsUsed,
    mistakes: options?.runOverrides?.mistakes ?? currentSession.mistakes,
  };
  const missionsCompleted = evaluateMissions(
    currentPuzzle,
    run,
    currentSession.eraseUsedBeforeRowsResolved,
  );
  const result: LevelResult = {
    stars: computeStars(currentPuzzle, run),
    missionsCompleted,
    bestRun: run,
  };
  const nextProgress = { ...current.progress };
  const currentDifficultyProgress = nextProgress[currentDifficulty];
  const previous =
    currentDifficultyProgress.levelResults[String(currentPuzzle.level)];
  const levelResults = {
    ...currentDifficultyProgress.levelResults,
    [String(currentPuzzle.level)]: isBetterRun(result, previous)
      ? result
      : previous,
  };
  const clearedLevels = Object.keys(levelResults).length;

  nextProgress[currentDifficulty] = {
    ...currentDifficultyProgress,
    levelResults,
    clearedLevels,
    highestUnlockedLevel: Math.max(
      currentDifficultyProgress.highestUnlockedLevel,
      currentPuzzle.level + 1,
    ),
  };

  return {
    ...current,
    progress: nextProgress,
    hintStock: options?.consumeHint
      ? Math.max(0, current.hintStock - 1)
      : current.hintStock,
    session: {
      ...currentSession,
      marks: nextMarks,
      hintsUsed: run.hintsUsed,
      status: "won",
    },
  };
}

export function getToolLockState(
  puzzle: Puzzle,
  marks: CellMark[][],
  current: boolean,
) {
  if (!current || !puzzle.toolLock) {
    return false;
  }

  return !hasVisibleMatchedTarget(puzzle, marks);
}
