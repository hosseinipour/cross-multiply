import {
  applyRevealedMarks,
  areAllRowTargetsMet,
  autoResolveMatchedLines,
  createEmptyMarks,
  createPuzzle,
  describeUnlocks,
  DIFFICULTIES,
  DIFFICULTY_ORDER,
  getNextCommitment,
  getNextNoEchoLine,
  hasVisibleMatchedTarget,
  isPuzzleConsistent,
  isPuzzleSolved,
  type ActiveCommitment,
  type CellMark,
  type DelayedCell,
  type DifficultyId,
  type Puzzle,
  type TargetAxis,
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
  bestTimeMs?: number;
};

export type WinSummary = {
  timeMs: number;
  previousBestMs: number | null;
  firstClear: boolean;
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
  /** Solve time banked so far; the live segment runs from `activeSince`. */
  elapsedMs: number;
  activeSince: number | null;
  /** Cells erased automatically by the last move, for the sweep animation. */
  autoCleared: DelayedCell[];
  lastWin: WinSummary | null;
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
const MAX_TIME_MS = 24 * 60 * 60 * 1000;
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
    elapsedMs: 0,
    activeSince: Date.now(),
    autoCleared: [],
    lastWin: null,
  };
}

export function foldElapsed(session: SessionState, now: number) {
  const segment =
    session.activeSince === null ? 0 : Math.max(0, now - session.activeSince);

  return Math.min(MAX_TIME_MS, session.elapsedMs + segment);
}

/** Pauses or resumes the solve clock, e.g. when the tab is hidden. */
export function setClockRunning(
  session: SessionState,
  running: boolean,
  now: number,
): SessionState {
  if (session.status !== "playing") {
    return session.activeSince === null
      ? session
      : { ...session, activeSince: null };
  }

  if (running) {
    return session.activeSince === null ? { ...session, activeSince: now } : session;
  }

  return { ...session, elapsedMs: foldElapsed(session, now), activeSince: null };
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

  const bestTimeMs = clampInteger(value.bestTimeMs, 0, 0, MAX_TIME_MS);

  return {
    stars: clampInteger(value.stars, 1, 1, 3),
    missionsCompleted,
    bestRun: sanitizeRunSummary(value.bestRun),
    ...(bestTimeMs > 0 ? { bestTimeMs } : {}),
  };
}

const CELL_MARKS = new Set<unknown>(["hidden", "selected", "erased"]);

function sanitizeLine(value: unknown, size: number): ActiveCommitment | null {
  if (
    !isRecord(value) ||
    (value.axis !== "row" && value.axis !== "column") ||
    !Number.isInteger(value.index) ||
    (value.index as number) < 0 ||
    (value.index as number) >= size
  ) {
    return null;
  }

  return { axis: value.axis as TargetAxis, index: value.index as number };
}

/**
 * Restores an in-progress board from storage so a reload does not throw
 * away a half-solved puzzle. Anything that does not check out falls back to
 * a fresh board.
 */
function sanitizeSession(
  value: unknown,
  difficulty: DifficultyId,
  maxLevel: number,
): SessionState | null {
  if (!isRecord(value) || value.status !== "playing" || !isRecord(value.puzzle)) {
    return null;
  }

  const puzzle = value.puzzle as unknown as Puzzle;

  if (
    puzzle.difficulty !== difficulty ||
    puzzle.size !== DIFFICULTIES[difficulty].size ||
    !Number.isInteger(puzzle.level) ||
    puzzle.level < 1 ||
    puzzle.level > maxLevel ||
    !Array.isArray(puzzle.modifiers) ||
    !Array.isArray(puzzle.missions) ||
    !Number.isInteger(puzzle.maxHearts) ||
    puzzle.maxHearts < 1 ||
    !isPuzzleConsistent(puzzle)
  ) {
    return null;
  }

  const marks = value.marks;

  if (
    !Array.isArray(marks) ||
    marks.length !== puzzle.size ||
    !marks.every(
      (line, row) =>
        Array.isArray(line) &&
        line.length === puzzle.size &&
        line.every(
          (mark, col) =>
            CELL_MARKS.has(mark) &&
            (mark === "hidden" || (mark === "selected") === puzzle.solution[row][col]),
        ),
    )
  ) {
    return null;
  }

  const base = buildSessionFromPuzzle(puzzle);
  const typedMarks = marks as CellMark[][];
  const toolLocked = getToolLockState(puzzle, typedMarks, Boolean(puzzle.toolLock));

  return {
    ...base,
    marks: typedMarks,
    hearts: clampInteger(value.hearts, base.maxHearts, 1, base.maxHearts),
    mode: !toolLocked && value.mode === "erase" ? "erase" : base.mode,
    hintsUsed: clampInteger(value.hintsUsed, 0, 0),
    mistakes: clampInteger(value.mistakes, 0, 0),
    eraseUsedBeforeRowsResolved: Boolean(value.eraseUsedBeforeRowsResolved),
    toolLocked,
    activeCommitment: getNextCommitment(
      puzzle,
      typedMarks,
      sanitizeLine(value.activeCommitment, puzzle.size),
    ),
    noEchoLine: getNextNoEchoLine(
      puzzle,
      typedMarks,
      sanitizeLine(value.noEchoLine, puzzle.size),
    ),
    elapsedMs: clampInteger(value.elapsedMs, 0, 0, MAX_TIME_MS),
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
      session:
        sanitizeSession(
          parsed.session,
          difficulty,
          nextProgress[difficulty].highestUnlockedLevel,
        ) ?? buildSession(difficulty, level),
      dismissedModifierTips: parsed.dismissedModifierTips ?? {},
      onboardingDismissed: Boolean(parsed.onboardingDismissed),
    };
  } catch {
    return fallback;
  }
}

export function getRunSummary(session: SessionState): RunSummary {
  return {
    heartsLeft: session.hearts,
    maxHearts: session.maxHearts,
    hintsUsed: session.hintsUsed,
    mistakes: session.mistakes,
  };
}

export function getLevelResult(
  progress: ProgressState,
  difficulty: DifficultyId,
  level: number,
) {
  return progress[difficulty].levelResults[String(level)] ?? null;
}

export function computeStars(_puzzle: Puzzle, run: RunSummary) {
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

export function evaluateMissions(
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
  options?: WinOptions & { now?: number },
): PersistedState {
  const currentSession = current.session;
  const timeMs = foldElapsed(currentSession, options?.now ?? Date.now());
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
  const previousBestMs = previous?.bestTimeMs ?? null;
  const bestTimeMs =
    timeMs > 0
      ? Math.min(previousBestMs ?? Number.POSITIVE_INFINITY, timeMs)
      : previousBestMs;
  const levelResults = {
    ...currentDifficultyProgress.levelResults,
    [String(currentPuzzle.level)]: {
      ...(isBetterRun(result, previous) ? result : previous),
      ...(bestTimeMs ? { bestTimeMs } : {}),
    },
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
      elapsedMs: timeMs,
      activeSince: null,
      lastWin: {
        timeMs,
        previousBestMs,
        firstClear: !previous,
      },
    },
  };
}

export type MoveSource = "player" | "hint";

/**
 * Places a known-correct mark, auto-clears any lines it completes, updates
 * every line constraint, and settles a win. Returns one-line notices for any
 * modifier gates that opened.
 */
export function applyCorrectMark(
  current: PersistedState,
  row: number,
  col: number,
  mark: Exclude<CellMark, "hidden">,
  source: MoveSource,
  now = Date.now(),
): { state: PersistedState; notices: string[] } {
  const session = current.session;
  const puzzle = session.puzzle;
  const placed = session.marks.map((line) => [...line]);
  placed[row][col] = mark;

  const { marks: nextMarks, cleared } = autoResolveMatchedLines(puzzle, placed);
  const fromHint = source === "hint";
  const hintsUsed = session.hintsUsed + (fromHint ? 1 : 0);
  const hintStock = fromHint
    ? Math.max(0, current.hintStock - 1)
    : current.hintStock;
  const eraseUsedBeforeRowsResolved =
    session.eraseUsedBeforeRowsResolved ||
    (!fromHint && mark === "erased" && !areAllRowTargetsMet(puzzle, session.marks));
  const nextSession: SessionState = {
    ...session,
    hintsUsed,
    eraseUsedBeforeRowsResolved,
    autoCleared: cleared,
  };

  if (isPuzzleSolved(puzzle, nextMarks)) {
    return {
      state: applyWinResult(
        { ...current, hintStock, session: nextSession },
        nextMarks,
        { now },
      ),
      notices: [],
    };
  }

  const toolLocked = getToolLockState(puzzle, nextMarks, session.toolLocked);
  const notices = describeUnlocks(puzzle, session.marks, nextMarks);

  if (session.toolLocked && !toolLocked) {
    notices.unshift("Erase unlocked.");
  }

  return {
    state: {
      ...current,
      hintStock,
      session: {
        ...nextSession,
        marks: nextMarks,
        focusKey: `${row}-${col}-${fromHint ? "hint-" : ""}${now}`,
        toolLocked,
        activeCommitment: fromHint
          ? getNextCommitment(puzzle, nextMarks, session.activeCommitment)
          : getNextCommitment(puzzle, nextMarks, session.activeCommitment, row, col),
        noEchoLine: getNextNoEchoLine(
          puzzle,
          nextMarks,
          session.noEchoLine,
          row,
          col,
        ),
      },
    },
    notices,
  };
}

export function applyMistake(
  current: PersistedState,
  row: number,
  col: number,
  now = Date.now(),
): PersistedState {
  const session = current.session;
  const hearts = session.hearts - 1;
  const lost = hearts <= 0;

  return {
    ...current,
    session: {
      ...session,
      hearts,
      mistakes: session.mistakes + 1,
      status: lost ? "lost" : "playing",
      focusKey: `${row}-${col}-miss-${now}`,
      autoCleared: [],
      ...(lost ? { elapsedMs: foldElapsed(session, now), activeSince: null } : {}),
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
