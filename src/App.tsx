import { useEffect, useState, useTransition } from "react";
import type { CSSProperties } from "react";
import {
  CheckCircle2,
  Eraser,
  Heart,
  Lightbulb,
  Moon,
  RefreshCw,
  Sun,
} from "lucide-react";
import {
  createEmptyMarks,
  createPuzzle,
  DIFFICULTY_ORDER,
  DIFFICULTIES,
  getColProgress,
  isColResolved,
  isPuzzleSolved,
  revealHint,
} from "./game";
import type { CellMark, DifficultyId, Puzzle } from "./game";
import {
  HapticButton,
} from "./components/HapticButton";
import { Hearts } from "./components/Hearts";
import {
  vibrateOnCorrectPick,
  vibrateOnMistake,
} from "./components/haptics";
import { RowFragment } from "./components/RowFragment";
import { TargetBadge } from "./components/TargetBadge";
import { ToolButton } from "./components/ToolButton";

type ThemeMode = "dark" | "light";
type ToolMode = "select" | "erase";
type GameStatus = "playing" | "won" | "lost";

type SessionState = {
  puzzle: Puzzle;
  marks: CellMark[][];
  hearts: number;
  mode: ToolMode;
  status: GameStatus;
  focusKey: string | null;
};

type PersistedState = {
  theme: ThemeMode;
  unlocked: Record<DifficultyId, number>;
  difficulty: DifficultyId;
  hintStock: number;
  session: SessionState;
};

const STORAGE_KEY = "cross-multiply-state";
const STARTING_HINTS = 3;
const MAX_HINT_STOCK = 10;
const HINT_REWARD_INTERVAL = 5;
const INITIAL_UNLOCKED = Object.fromEntries(
  DIFFICULTY_ORDER.map((id) => [id, 1]),
) as Record<DifficultyId, number>;

function buildSession(difficulty: DifficultyId, level: number): SessionState {
  const puzzle = createPuzzle(level, difficulty);

  return {
    puzzle,
    marks: createEmptyMarks(puzzle.size),
    hearts: 3,
    mode: "select",
    status: "playing",
    focusKey: null,
  };
}

function loadPersistedState(): PersistedState {
  const fallback: PersistedState = {
    theme: "dark",
    unlocked: INITIAL_UNLOCKED,
    difficulty: "easy",
    hintStock: STARTING_HINTS,
    session: buildSession("easy", 1),
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw) as Partial<PersistedState>;

    if (!parsed.session || !parsed.unlocked || !parsed.theme) {
      return fallback;
    }

    const nextDifficulty =
      parsed.difficulty && parsed.difficulty in DIFFICULTIES
        ? parsed.difficulty
        : fallback.difficulty;

    return {
      ...parsed,
      difficulty: nextDifficulty,
      unlocked: {
        ...INITIAL_UNLOCKED,
        ...parsed.unlocked,
      },
      hintStock:
        typeof parsed.hintStock === "number"
          ? Math.max(0, Math.min(MAX_HINT_STOCK, parsed.hintStock))
          : STARTING_HINTS,
    } as PersistedState;
  } catch {
    return fallback;
  }
}

function App() {
  const [persisted, setPersisted] = useState<PersistedState>(() =>
    loadPersistedState(),
  );
  const [isPending, startTransition] = useTransition();

  const { difficulty, hintStock, session, theme, unlocked } = persisted;
  const puzzle = session.puzzle;
  const size = puzzle.size;
  const difficultyConfig = DIFFICULTIES[difficulty];

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
    nextDifficulty = difficulty,
  ) => {
    setPersisted((current) => ({
      ...current,
      difficulty: nextDifficulty,
      session: nextSession,
    }));
  };

  const generateLevel = (nextDifficulty: DifficultyId, level: number) => {
    startTransition(() => {
      replaceSession(buildSession(nextDifficulty, level), nextDifficulty);
    });
  };

  const setMode = (mode: ToolMode) => {
    setPersisted((current) => ({
      ...current,
      session: {
        ...current.session,
        mode,
      },
    }));
  };

  const retryLevel = () => {
    replaceSession({
      ...session,
      marks: createEmptyMarks(size),
      hearts: 3,
      status: "playing",
      mode: "select",
      focusKey: null,
    });
  };

  const moveToNextLevel = () => {
    const nextLevel = session.puzzle.level + 1;
    setPersisted((current) => ({
      ...current,
      hintStock:
        current.session.puzzle.level % HINT_REWARD_INTERVAL === 0
          ? Math.min(MAX_HINT_STOCK, current.hintStock + 1)
          : current.hintStock,
      unlocked: {
        ...current.unlocked,
        [difficulty]: Math.max(current.unlocked[difficulty], nextLevel),
      },
    }));
    generateLevel(difficulty, nextLevel);
  };

  const changeDifficulty = (nextDifficulty: DifficultyId) => {
    if (nextDifficulty === difficulty) {
      return;
    }

    generateLevel(nextDifficulty, unlocked[nextDifficulty]);
  };

  const applyCorrectMark = (row: number, col: number, mark: CellMark) => {
    const nextMarks = session.marks.map((line) => [...line]);
    nextMarks[row][col] = mark;

    const solved = isPuzzleSolved(puzzle, nextMarks);

    setPersisted((current) => ({
      ...current,
      session: {
        ...current.session,
        marks: nextMarks,
        focusKey: `${row}-${col}-${Date.now()}`,
        status: solved ? "won" : current.session.status,
      },
      unlocked: solved
        ? {
            ...current.unlocked,
            [difficulty]: Math.max(
              current.unlocked[difficulty],
              current.session.puzzle.level + 1,
            ),
          }
        : current.unlocked,
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

    setPersisted((current) => ({
      ...current,
      hintStock: Math.max(0, current.hintStock - 1),
      session: {
        ...current.session,
        marks: nextMarks,
        status: solved ? "won" : current.session.status,
        focusKey: `${hint.row}-${hint.col}-hint-${Date.now()}`,
      },
      unlocked: solved
        ? {
            ...current.unlocked,
            [difficulty]: Math.max(
              current.unlocked[difficulty],
              current.session.puzzle.level + 1,
            ),
          }
        : current.unlocked,
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

      <main className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col px-0 pb-0 pt-0 sm:px-6 sm:pb-8 sm:pt-6 lg:px-8">
        <section className="mx-auto flex w-full max-w-none flex-col gap-6 lg:max-w-[68rem] lg:flex-row lg:items-start">
          <div className="flex-1">
            <div className="min-h-screen rounded-none border-y border-[var(--panel-border)] bg-[var(--panel-bg)]/95 p-3 shadow-[0_24px_80px_rgba(6,10,24,0.35)] backdrop-blur sm:min-h-0 sm:rounded-[2rem] sm:border sm:p-4 xl:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.42em] text-[var(--text-muted)]">
                    Multiply Puzzle
                  </p>
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

              <div className="mt-4 flex flex-col gap-5 lg:mt-6 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="hidden text-sm uppercase tracking-[0.35em] text-[var(--text-muted)] sm:block">
                    {difficultyConfig.label}
                  </p>
                  <div className="flex items-baseline gap-3 sm:block">
                    <h1 className="font-['Georgia'] text-4xl font-bold tracking-tight text-[var(--text-primary)] sm:mt-2 sm:text-5xl">
                      Level {puzzle.level}
                    </h1>
                    <span className="text-sm uppercase tracking-[0.3em] text-[var(--text-muted)] sm:hidden">
                      {difficultyConfig.label}
                    </span>
                  </div>
                </div>

                <div className="-mx-3 flex gap-3 overflow-x-auto px-3 pb-4 lg:-mx-1 lg:px-1">
                  {DIFFICULTY_ORDER.map((id) => {
                    const active = difficulty === id;
                    return (
                      <HapticButton
                        key={id}
                        type="button"
                        onClick={() => changeDifficulty(id)}
                        className={`shrink-0 rounded-2xl border px-2.5 py-2 text-left transition sm:px-4 sm:py-3 ${
                          active
                            ? "border-[var(--accent)] bg-[var(--accent-soft)] shadow-[0_6px_18px_rgba(247,122,168,0.16)]"
                            : "border-[var(--panel-border)] bg-[var(--panel-muted)] hover:border-[var(--accent)]/30 hover:bg-[var(--panel-bg)]"
                        }`}
                      >
                        <div className="text-xs uppercase tracking-[0.3em] text-[var(--text-muted)]">
                          {DIFFICULTIES[id].label}
                        </div>
                        <div className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
                          {unlocked[id]}
                        </div>
                      </HapticButton>
                    );
                  })}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="rounded-[1.75rem] border border-[var(--panel-border)] bg-[var(--board-shell)] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-4">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <div className="flex flex-wrap items-center gap-3">
                      <Hearts hearts={session.hearts} />
                    </div>
                  </div>

                  <div className="mx-auto w-full max-w-3xl">
                    <div className="grid gap-1.5 sm:gap-3" style={boardStyle}>
                      <div className="rounded-2xl border border-dashed border-[var(--panel-border)] bg-[var(--panel-muted)]/60" />

                      {puzzle.colTargets.map((target, col) => {
                        const resolved = isColResolved(
                          puzzle,
                          session.marks,
                          col,
                        );
                        const progress = getColProgress(
                          puzzle,
                          session.marks,
                          col,
                        );
                        return (
                          <TargetBadge
                            key={`col-${col}`}
                            target={target}
                            progress={progress}
                            resolved={resolved}
                            axis="column"
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
                    <div className="grid grid-cols-2 gap-2 sm:gap-3">
                      <ToolButton
                        active={session.mode === "erase"}
                        onClick={() => setMode("erase")}
                        icon={<Eraser className="h-5 w-5" strokeWidth={1.8} />}
                      />
                      <ToolButton
                        active={session.mode === "select"}
                        onClick={() => setMode("select")}
                        icon={
                          <CheckCircle2 className="h-5 w-5" strokeWidth={1.8} />
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {(isPending || session.status !== "playing") && (
          <div className="pointer-events-none fixed inset-x-0 bottom-4 mx-auto flex w-fit max-w-[90vw] items-center gap-3 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 px-4 py-3 text-sm text-[var(--text-primary)] shadow-[0_18px_48px_rgba(0,0,0,0.25)] backdrop-blur">
            {isPending && <span>Generating a fresh puzzle...</span>}
            {!isPending && session.status === "won" && (
              <span>Level cleared. The next puzzle is ready when you are.</span>
            )}
            {!isPending && session.status === "lost" && (
              <span>
                Retry the board or roll a new layout from the top-right button.
              </span>
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
                All hearts are gone. Try the level again.
              </p>
              <HapticButton
                type="button"
                onClick={retryLevel}
                className="mt-6 w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(247,122,168,0.3)] transition hover:-translate-y-0.5"
              >
                Retry
              </HapticButton>
            </div>
          </div>
        )}

        {session.status === "won" && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-400/25 bg-emerald-500/12 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" strokeWidth={1.8} />
              </div>
              <h2 className="mt-4 text-2xl font-semibold text-[var(--text-primary)]">
                You won
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                The puzzle is solved. Move on to the next level.
              </p>
              <HapticButton
                type="button"
                onClick={moveToNextLevel}
                className="mt-6 w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(247,122,168,0.3)] transition hover:-translate-y-0.5"
              >
                Next level
              </HapticButton>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
