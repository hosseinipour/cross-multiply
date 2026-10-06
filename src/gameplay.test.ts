import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyCorrectMark,
  applyMistake,
  buildSessionFromPuzzle,
  createProgressState,
  isDifficultyAvailable,
  unlockAllDifficulties,
  loadPersistedState,
  setClockRunning,
  STORAGE_KEY,
  type PersistedState,
} from "./appState";
import { formatDuration } from "./components/formatDuration";
import {
  autoResolveMatchedLines,
  createEmptyMarks,
  createPuzzle,
  describeUnlocks,
  DIFFICULTY_ORDER,
  findLogicalHint,
  revealHint,
  type CellMark,
  type Puzzle,
} from "./game";

function createTestPuzzle(overrides: Partial<Puzzle> = {}): Puzzle {
  return {
    id: "test-puzzle",
    level: 1,
    difficulty: "easy",
    size: 2,
    board: [
      [2, 3],
      [5, 7],
    ],
    solution: [
      [true, false],
      [false, true],
    ],
    rowTargets: [2, 7],
    colTargets: [2, 7],
    modifiers: [],
    missions: [],
    maxHearts: 3,
    chapter: "Test",
    bandLabel: "Test",
    ...overrides,
  };
}

function createState(puzzle: Puzzle, now = 1000): PersistedState {
  return {
    theme: "light",
    difficulty: puzzle.difficulty,
    hintStock: 3,
    progress: createProgressState(),
    session: { ...buildSessionFromPuzzle(puzzle), activeSince: now },
    dismissedModifierTips: {},
    onboardingDismissed: true,
  };
}

function withMarks(size: number, placed: Array<[number, number, CellMark]>) {
  const marks = createEmptyMarks(size);

  for (const [row, col, mark] of placed) {
    marks[row][col] = mark;
  }

  return marks;
}

describe("auto-resolving matched lines", () => {
  it("erases the leftovers on every line whose visible target is met", () => {
    const puzzle = createTestPuzzle();
    const { marks, cleared } = autoResolveMatchedLines(
      puzzle,
      withMarks(2, [[0, 0, "selected"]]),
    );

    expect(marks[0][1]).toBe("erased");
    expect(marks[1][0]).toBe("erased");
    expect(marks[1][1]).toBe("hidden");
    expect(cleared).toHaveLength(2);
  });

  it("does not leak a match on a line whose target is still fogged", () => {
    const puzzle = createTestPuzzle({
      hiddenTargets: [{ axis: "row", index: 0, reveal: { kind: "marks", threshold: 2 } }],
    });
    const { marks } = autoResolveMatchedLines(
      puzzle,
      withMarks(2, [[0, 0, "selected"]]),
    );

    expect(marks[0][1]).toBe("hidden");
    expect(marks[1][0]).toBe("erased");
  });

  it("leaves sealed cells for the player until their gate opens", () => {
    const puzzle = createTestPuzzle({
      sealedCells: { cells: [{ row: 0, col: 1 }], unlockAfterCorrectMarks: 5 },
    });
    const { marks } = autoResolveMatchedLines(
      puzzle,
      withMarks(2, [[0, 0, "selected"]]),
    );

    expect(marks[0][1]).toBe("hidden");
  });

  it("returns the same marks object when nothing changes", () => {
    const puzzle = createTestPuzzle();
    const marks = createEmptyMarks(2);

    expect(autoResolveMatchedLines(puzzle, marks).marks).toBe(marks);
  });
});

describe("logical hints", () => {
  it("prefers a single-line deduction and explains it", () => {
    const puzzle = createTestPuzzle({
      size: 3,
      board: [
        [2, 3, 5],
        [7, 11, 13],
        [17, 19, 23],
      ],
      solution: [
        [true, false, false],
        [false, true, false],
        [false, false, true],
      ],
      rowTargets: [2, 11, 23],
      colTargets: [2, 11, 23],
    });

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const hint = revealHint(puzzle, createEmptyMarks(3));

      expect(hint).not.toBeNull();
      expect(hint!.mark).toBe(puzzle.solution[hint!.row][hint!.col] ? "selected" : "erased");
      expect(hint!.reason).toContain("doesn't divide");
    }
  });

  it("finds forced selections when every combination needs the cell", () => {
    const puzzle = createTestPuzzle({
      solution: [
        [true, true],
        [false, false],
      ],
      rowTargets: [6, 1],
      colTargets: [2, 3],
    });
    const hint = findLogicalHint(puzzle, createEmptyMarks(2), [{ row: 0, col: 0 }]);

    expect(hint).toMatchObject({ row: 0, col: 0, mark: "selected" });
    expect(hint!.reason).toContain("Every way");
  });

  it("returns null when no visible line settles a candidate", () => {
    const puzzle = createTestPuzzle({
      crossBlind: { hiddenAxis: "row", unlockAfterMatchedVisibleLines: 2 },
      hiddenTargets: [
        { axis: "column", index: 0, reveal: { kind: "matchedOrResolved" } },
        { axis: "column", index: 1, reveal: { kind: "matchedOrResolved" } },
      ],
    });

    expect(
      findLogicalHint(puzzle, createEmptyMarks(2), [{ row: 0, col: 0 }]),
    ).toBeNull();
  });
});

describe("move reducers", () => {
  it("auto-clears completed lines, then settles the win with time and best", () => {
    const puzzle = createTestPuzzle();
    const first = applyCorrectMark(createState(puzzle), 0, 0, "selected", "player", 2000);

    expect(first.state.session.marks).toEqual([
      ["selected", "erased"],
      ["erased", "hidden"],
    ]);
    expect(first.state.session.autoCleared).toHaveLength(2);

    const second = applyCorrectMark(first.state, 1, 1, "selected", "player", 5000);
    const result = second.state.progress.easy.levelResults["1"];

    expect(second.state.session.status).toBe("won");
    expect(second.state.session.lastWin).toEqual({
      timeMs: 4000,
      previousBestMs: null,
      firstClear: true,
    });
    expect(result.bestTimeMs).toBe(4000);
  });

  it("keeps the faster time when replaying a cleared level", () => {
    const puzzle = createTestPuzzle();
    let state = createState(puzzle);
    state = applyCorrectMark(state, 0, 0, "selected", "player", 2000).state;
    state = applyCorrectMark(state, 1, 1, "selected", "player", 4000).state;

    let replay: PersistedState = {
      ...state,
      session: { ...buildSessionFromPuzzle(puzzle), activeSince: 0 },
    };
    replay = applyCorrectMark(replay, 0, 0, "selected", "player", 9000).state;
    replay = applyCorrectMark(replay, 1, 1, "selected", "player", 10000).state;

    expect(replay.session.lastWin).toMatchObject({ previousBestMs: 3000, firstClear: false });
    expect(replay.progress.easy.levelResults["1"].bestTimeMs).toBe(3000);
  });

  it("charges hints to stock and run stats", () => {
    const puzzle = createTestPuzzle();
    const { state } = applyCorrectMark(createState(puzzle), 0, 0, "selected", "hint");

    expect(state.hintStock).toBe(2);
    expect(state.session.hintsUsed).toBe(1);
    expect(state.session.focusKey).toMatch(/^0-0-hint-/);
  });

  it("flags Row Rush when erase is used before row targets are met", () => {
    const puzzle = createTestPuzzle();
    const { state } = applyCorrectMark(createState(puzzle), 0, 1, "erased", "player");

    expect(state.session.eraseUsedBeforeRowsResolved).toBe(true);
  });

  it("announces erase unlocking under tool lock", () => {
    const puzzle = createTestPuzzle({
      toolLock: { initialMode: "select", unlock: "visibleTargetMatched" },
    });
    const { notices } = applyCorrectMark(createState(puzzle), 0, 0, "selected", "player");

    expect(notices[0]).toBe("Erase unlocked.");
  });

  it("spends a heart on a miss and stops the clock on a loss", () => {
    const puzzle = createTestPuzzle({ maxHearts: 1 });
    const state = applyMistake(createState(puzzle, 1000), 0, 1, 3500);

    expect(state.session.status).toBe("lost");
    expect(state.session.hearts).toBe(0);
    expect(state.session.mistakes).toBe(1);
    expect(state.session.activeSince).toBeNull();
    expect(state.session.elapsedMs).toBe(2500);
  });

  it("pauses and resumes the solve clock", () => {
    const session = { ...buildSessionFromPuzzle(createTestPuzzle()), activeSince: 1000 };
    const paused = setClockRunning(session, false, 4000);
    const resumed = setClockRunning(paused, true, 10000);

    expect(paused).toMatchObject({ elapsedMs: 3000, activeSince: null });
    expect(resumed).toMatchObject({ elapsedMs: 3000, activeSince: 10000 });
  });
});

describe("unlock notices", () => {
  it("reports gates that open between two board states", () => {
    const puzzle = createTestPuzzle({
      hintGate: { unlockAfterCorrectMarks: 1 },
      sealedCells: { cells: [{ row: 1, col: 1 }], unlockAfterCorrectMarks: 1 },
    });
    const messages = describeUnlocks(
      puzzle,
      createEmptyMarks(2),
      withMarks(2, [[0, 0, "selected"]]),
    );

    expect(messages).toEqual(["Hints unlocked.", "Sealed cells are open."]);
  });
});

describe("session restore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubStorage(saved: unknown) {
    const store = new Map([[STORAGE_KEY, JSON.stringify(saved)]]);
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => store.set(key, value),
      },
    });
  }

  it("keeps cheated worlds open after reloading without granting clears", () => {
    const state = createState(createPuzzle(1, "mythic"));
    const progress = unlockAllDifficulties(state.progress);
    stubStorage({ ...state, progress });

    const loaded = loadPersistedState();

    expect(loaded.difficulty).toBe("mythic");
    for (const id of DIFFICULTY_ORDER) {
      expect(isDifficultyAvailable(loaded.progress, id)).toBe(true);
      expect(loaded.progress[id].clearedLevels).toBe(0);
      expect(loaded.progress[id].highestUnlockedLevel).toBe(1);
      expect(loaded.progress[id].levelResults).toEqual({});
    }
  });

  it("brings back an in-progress board after a reload", () => {
    const puzzle = createPuzzle(1, "easy");
    const state = createState(puzzle);
    const row = puzzle.solution[0].indexOf(true);
    const marks = withMarks(puzzle.size, [[0, row, "selected"]]);
    stubStorage({
      ...state,
      session: { ...state.session, marks, hearts: 2, mistakes: 1, elapsedMs: 4200 },
    });

    const loaded = loadPersistedState();

    expect(loaded.session.puzzle.id).toBe(puzzle.id);
    expect(loaded.session.marks[0][row]).toBe("selected");
    expect(loaded.session).toMatchObject({ hearts: 2, mistakes: 1, elapsedMs: 4200 });
  });

  it("builds a fresh board when the saved one has been tampered with", () => {
    const puzzle = createPuzzle(1, "easy");
    const state = createState(puzzle);
    const wrongCol = puzzle.solution[0].indexOf(false);
    stubStorage({
      ...state,
      session: {
        ...state.session,
        marks: withMarks(puzzle.size, [[0, wrongCol, "selected"]]),
      },
    });

    expect(loadPersistedState().session.puzzle.id).not.toBe(puzzle.id);
  });
});

describe("formatDuration", () => {
  it("formats minutes and hours", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65_000)).toBe("1:05");
    expect(formatDuration(3_725_000)).toBe("1:02:05");
  });
});

describe("world unlock cheat", () => {
  it("opens all worlds and preserves earned progress without mutating it", () => {
    const state = applyCorrectMark(
      applyCorrectMark(
        createState(createTestPuzzle()), 0, 0, "selected", "player", 2000,
      ).state,
      1, 1, "selected", "player", 5000,
    ).state;
    const original = structuredClone(state.progress);
    const unlocked = unlockAllDifficulties(state.progress);

    for (const id of DIFFICULTY_ORDER) {
      expect(isDifficultyAvailable(unlocked, id)).toBe(true);
      expect(unlocked[id]).toEqual({ ...original[id], cheatUnlocked: true });
    }
    expect(state.progress).toEqual(original);
    expect(isDifficultyAvailable(state.progress, "expert")).toBe(false);
    expect(unlockAllDifficulties(unlocked)).toEqual(unlocked);
  });
});
