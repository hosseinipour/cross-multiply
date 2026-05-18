import { useEffect, useRef, useState, useTransition } from "react";
import {
  areAllRowTargetsMet,
  getNextCommitment,
  getNextNoEchoLine,
  isCellBlockedByCommitment,
  isCellBlockedByNoEcho,
  isCellBlockedBySpotlight,
  isCellDelayed,
  isHintGateUnlocked,
  isPuzzleSolved,
  revealHint,
  type CellMark,
  type DifficultyId,
  type ToolMode,
} from "./game";
import {
  applyWinResult,
  buildSession,
  buildSessionFromPuzzle,
  getLevelResult,
  getToolLockState,
  isDifficultyAvailable,
  loadPersistedState,
  MAX_HINT_STOCK,
  STORAGE_KEY,
  unlockAllDifficulties,
  type PersistedState,
  type SessionState,
  type ThemeMode,
  type WinOptions,
} from "./appState";
import type { ModifierId } from "./progression";
import {
  vibrateOnCorrectPick,
  vibrateOnMistake,
} from "./components/haptics";

const CHEAT_TOGGLE_COUNT = 10;
const CHEAT_TOGGLE_WINDOW_MS = 4000;

export function useCrossMultiplyGame() {
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
  const currentResult = getLevelResult(progress, difficulty, puzzle.level);
  const hintGateUnlocked = isHintGateUnlocked(puzzle, session.marks);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.dataset.theme = theme;
    }

    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
    } catch {
      // Private browsing, quota limits, and locked-down storage should not break play.
    }
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

  const rerollCurrentBoard = () => {
    generateLevel(difficulty, puzzle.level);
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
    options?: WinOptions,
  ) => {
    setPersisted((current) => applyWinResult(current, nextMarks, options));
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

    setPersisted((current) => {
      const currentPuzzle = current.session.puzzle;

      if (
        current.session.status !== "playing" ||
        current.hintStock <= 0 ||
        !isHintGateUnlocked(currentPuzzle, current.session.marks)
      ) {
        return current;
      }

      const hint = revealHint(currentPuzzle, current.session.marks, {
        activeCommitment: current.session.activeCommitment,
        noEchoLine: current.session.noEchoLine,
      });

      if (!hint) {
        return current;
      }

      const nextMarks = current.session.marks.map((line) => [...line]);
      nextMarks[hint.row][hint.col] = hint.mark;

      if (isPuzzleSolved(currentPuzzle, nextMarks)) {
        return applyWinResult(current, nextMarks, {
          runOverrides: {
            hintsUsed: current.session.hintsUsed + 1,
          },
          consumeHint: true,
        });
      }

      return {
        ...current,
        hintStock: Math.max(0, current.hintStock - 1),
        session: {
          ...current.session,
          marks: nextMarks,
          hintsUsed: current.session.hintsUsed + 1,
          focusKey: `${hint.row}-${hint.col}-hint-${Date.now()}`,
          toolLocked: getToolLockState(
            currentPuzzle,
            nextMarks,
            current.session.toolLocked,
          ),
          activeCommitment: getNextCommitment(
            currentPuzzle,
            nextMarks,
            current.session.activeCommitment,
          ),
          noEchoLine: getNextNoEchoLine(
            currentPuzzle,
            nextMarks,
            current.session.noEchoLine,
            hint.row,
            hint.col,
          ),
        },
      };
    });
  };

  return {
    currentResult,
    difficulty,
    dismissedModifierTips,
    hintGateUnlocked,
    hintStock,
    isPending,
    onboardingDismissed,
    progress,
    puzzle,
    session,
    theme,
    unlockDialogOpen,
    changeDifficulty,
    closeUnlockDialog: () => setUnlockDialogOpen(false),
    dismissModifierTip,
    dismissOnboarding,
    handleCellPress,
    moveToNextLevel,
    rerollCurrentBoard,
    rerollLevel,
    retryLevel,
    setMode,
    toggleTheme,
    useHint,
  };
}
