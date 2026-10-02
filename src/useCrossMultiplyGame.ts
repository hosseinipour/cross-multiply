import { useEffect, useRef, useState, useTransition } from "react";
import {
  areAllRowTargetsMet,
  isCellBlockedByCommitment,
  isCellBlockedByNoEcho,
  isCellBlockedBySpotlight,
  isCellDelayed,
  isHintGateUnlocked,
  revealHint,
  type DifficultyId,
  type ToolMode,
} from "./game";
import {
  applyCorrectMark,
  applyMistake,
  buildSession,
  buildSessionFromPuzzle,
  getLevelResult,
  isDifficultyAvailable,
  loadPersistedState,
  MAX_HINT_STOCK,
  setClockRunning,
  STORAGE_KEY,
  unlockAllDifficulties,
  type PersistedState,
  type SessionState,
  type ThemeMode,
} from "./appState";
import type { ModifierId } from "./progression";
import {
  vibrateOnCorrectPick,
  vibrateOnMistake,
} from "./components/haptics";

const CHEAT_TOGGLE_COUNT = 10;
const CHEAT_TOGGLE_WINDOW_MS = 4000;
const FEEDBACK_DURATION_MS = { hint: 5200, danger: 2600, info: 3200 } as const;

export type FeedbackTone = keyof typeof FEEDBACK_DURATION_MS;

export type Feedback = {
  id: number;
  tone: FeedbackTone;
  message: string;
};

export function useCrossMultiplyGame() {
  const [persisted, setPersisted] = useState<PersistedState>(() =>
    loadPersistedState(),
  );
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const themeToggleTimes = useRef<number[]>([]);
  const feedbackId = useRef(0);

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

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = window.setTimeout(
      () => setFeedback(null),
      FEEDBACK_DURATION_MS[feedback.tone],
    );

    return () => window.clearTimeout(timeout);
  }, [feedback]);

  useEffect(() => {
    // Only count solve time while the board is actually on screen.
    const handleVisibility = () => {
      const visible = document.visibilityState === "visible";

      setPersisted((current) => {
        const session = setClockRunning(current.session, visible, Date.now());
        return session === current.session ? current : { ...current, session };
      });
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const notify = (tone: FeedbackTone, message: string) => {
    feedbackId.current += 1;
    setFeedback({ id: feedbackId.current, tone, message });
  };

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
    setFeedback(null);
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
      notify("info", "Erase unlocks after you match a visible target.");
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

  const handleCellPress = (row: number, col: number, toolOverride?: ToolMode) => {
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

    const tool = toolOverride ?? session.mode;

    if (session.toolLocked && tool !== session.mode) {
      notify("info", "Erase unlocks after you match a visible target.");
      return;
    }

    const value = puzzle.board[row][col];
    const shouldSelect = puzzle.solution[row][col];

    if ((tool === "select") === shouldSelect) {
      vibrateOnCorrectPick();
      const { state, notices } = applyCorrectMark(
        persisted,
        row,
        col,
        shouldSelect ? "selected" : "erased",
        "player",
      );
      setPersisted(state);

      if (notices.length > 0) {
        notify("info", notices.join(" "));
      } else if (feedback?.tone === "danger") {
        setFeedback(null);
      }
      return;
    }

    vibrateOnMistake();
    const heartsLeft = session.hearts - 1;
    setPersisted(applyMistake(persisted, row, col));

    if (heartsLeft > 0) {
      notify(
        "danger",
        `${shouldSelect ? `${value} belongs in the product.` : `${value} isn't part of the product.`} ${heartsLeft} ${heartsLeft === 1 ? "heart" : "hearts"} left.`,
      );
    }
  };

  const requestHint = () => {
    if (session.status !== "playing" || hintStock <= 0 || !hintGateUnlocked) {
      if (session.status === "playing" && hintStock <= 0) {
        notify("info", "No hints left. Clear a level to earn one.");
      }
      return;
    }

    const hint = revealHint(puzzle, session.marks, {
      activeCommitment: session.activeCommitment,
      noEchoLine: session.noEchoLine,
    });

    if (!hint) {
      notify("info", "No open cell can take a hint right now.");
      return;
    }

    const { state, notices } = applyCorrectMark(
      persisted,
      hint.row,
      hint.col,
      hint.mark,
      "hint",
    );
    setPersisted(state);

    if (state.session.status === "playing") {
      notify("hint", [hint.reason, ...notices].join(" "));
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.repeat ||
        document.querySelector('[role="dialog"]')
      ) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "s") {
        setMode("select");
      } else if (key === "e") {
        setMode("erase");
      } else if (key === "h") {
        requestHint();
      } else {
        return;
      }

      event.preventDefault();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return {
    currentResult,
    difficulty,
    dismissedModifierTips,
    feedback,
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
    requestHint,
    toggleTheme,
  };
}
