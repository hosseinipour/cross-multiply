import {
  getLevelBlueprint,
  MISSION_DETAILS,
  MODIFIER_DETAILS,
  type MissionId,
  type ModifierId,
} from "./progression";

export type DifficultyId = "easy" | "medium" | "hard" | "expert" | "mythic";

export type CellMark = "hidden" | "selected" | "erased";

export type ToolMode = "select" | "erase";

export type TargetAxis = "row" | "column";

export type RevealedCell = {
  row: number;
  col: number;
  mark: Exclude<CellMark, "hidden">;
};

export type HiddenTarget = {
  axis: TargetAxis;
  index: number;
  revealAfterMarks: number;
};

export type PuzzleMission = {
  id: MissionId;
  title: string;
  description: string;
};

export type PuzzleModifier = {
  id: ModifierId;
  title: string;
  short: string;
  description: string;
};

export type Puzzle = {
  id: string;
  level: number;
  difficulty: DifficultyId;
  size: number;
  board: number[][];
  solution: boolean[][];
  rowTargets: number[];
  colTargets: number[];
  modifiers: PuzzleModifier[];
  missions: PuzzleMission[];
  revealedMarks?: RevealedCell[];
  hiddenTargets?: HiddenTarget[];
  initialMode?: ToolMode;
  toolUnlockCorrectMarks?: number;
  maxHearts: number;
  chapter: string;
  bandLabel: string;
};

export type DifficultyConfig = {
  id: DifficultyId;
  label: string;
  badge: string;
  size: number;
  minSelectedPerRow: number;
  maxSelectedPerRow: number;
  maxTarget: number;
  selectedRange: readonly [number, number];
  fillerRange: readonly [number, number];
  primeWeight: number;
  highValueWeight: number;
};

export const DIFFICULTY_ORDER: DifficultyId[] = [
  "easy",
  "medium",
  "hard",
  "expert",
  "mythic",
];

export const DIFFICULTIES: Record<DifficultyId, DifficultyConfig> = {
  easy: {
    id: "easy",
    label: "Easy",
    badge: "Warm-up",
    size: 4,
    minSelectedPerRow: 1,
    maxSelectedPerRow: 2,
    maxTarget: 100,
    selectedRange: [2, 5],
    fillerRange: [2, 9],
    primeWeight: 1.05,
    highValueWeight: 0.35,
  },
  medium: {
    id: "medium",
    label: "Medium",
    badge: "Steady",
    size: 5,
    minSelectedPerRow: 1,
    maxSelectedPerRow: 3,
    maxTarget: 200,
    selectedRange: [2, 7],
    fillerRange: [2, 9],
    primeWeight: 1.12,
    highValueWeight: 0.55,
  },
  hard: {
    id: "hard",
    label: "Hard",
    badge: "Tricky",
    size: 6,
    minSelectedPerRow: 2,
    maxSelectedPerRow: 3,
    maxTarget: 300,
    selectedRange: [2, 9],
    fillerRange: [2, 10],
    primeWeight: 1.22,
    highValueWeight: 0.8,
  },
  expert: {
    id: "expert",
    label: "Expert",
    badge: "Brutal",
    size: 7,
    minSelectedPerRow: 2,
    maxSelectedPerRow: 3,
    maxTarget: 700,
    selectedRange: [2, 13],
    fillerRange: [2, 13],
    primeWeight: 1.9,
    highValueWeight: 1.55,
  },
  mythic: {
    id: "mythic",
    label: "Mythic",
    badge: "Relentless",
    size: 8,
    minSelectedPerRow: 2,
    maxSelectedPerRow: 3,
    maxTarget: 1000,
    selectedRange: [2, 19],
    fillerRange: [2, 19],
    primeWeight: 2.35,
    highValueWeight: 2.15,
  },
};

type SolverCell = {
  row: number;
  col: number;
  value: number;
};

const GENERATOR_TRIES = 240;
const subsetMemo = new Map<string, boolean>();

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample<T>(items: T[]) {
  return items[randomInt(0, items.length - 1)];
}

function sampleWeighted(items: { value: number; weight: number }[]) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);

  if (totalWeight <= 0) {
    return items[items.length - 1].value;
  }

  let cursor = Math.random() * totalWeight;

  for (const item of items) {
    cursor -= item.weight;

    if (cursor <= 0) {
      return item.value;
    }
  }

  return items[items.length - 1].value;
}

function shuffle<T>(items: T[]) {
  const copy = [...items];

  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }

  return copy;
}

function createMatrix<T>(size: number, makeCell: (row: number, col: number) => T) {
  return Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => makeCell(row, col)),
  );
}

function product(values: number[]) {
  return values.reduce((total, value) => total * value, 1);
}

function createValueRange([min, max]: readonly [number, number]) {
  return Array.from({ length: max - min + 1 }, (_, index) => min + index);
}

function isPrime(value: number) {
  if (value < 2) {
    return false;
  }

  for (let divisor = 2; divisor * divisor <= value; divisor += 1) {
    if (value % divisor === 0) {
      return false;
    }
  }

  return true;
}

function getDivisorCount(value: number) {
  let total = 0;

  for (let divisor = 1; divisor * divisor <= value; divisor += 1) {
    if (value % divisor !== 0) {
      continue;
    }

    total += divisor * divisor === value ? 1 : 2;
  }

  return total;
}

function getLineProducts(board: number[][], solution: boolean[][]) {
  const size = board.length;

  const rowTargets = Array.from({ length: size }, (_, row) =>
    product(board[row].filter((_, col) => solution[row][col])),
  );
  const colTargets = Array.from({ length: size }, (_, col) =>
    product(
      board
        .map((line, row) => ({ value: line[col], selected: solution[row][col] }))
        .filter((cell) => cell.selected)
        .map((cell) => cell.value),
    ),
  );

  return { rowTargets, colTargets };
}

function canMakeProduct(values: number[], target: number) {
  const key = `${values.join(",")}|${target}`;
  const cached = subsetMemo.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const visit = (index: number, remaining: number): boolean => {
    if (remaining === 1) {
      return true;
    }

    if (index >= values.length) {
      return false;
    }

    if (visit(index + 1, remaining)) {
      return true;
    }

    const value = values[index];

    if (remaining % value === 0 && visit(index + 1, remaining / value)) {
      return true;
    }

    return false;
  };

  const result = visit(0, target);
  subsetMemo.set(key, result);
  return result;
}

export function countSolutions(
  board: number[][],
  rowTargets: number[],
  colTargets: number[],
  maxSolutions = 2,
) {
  const size = board.length;
  const cells = createMatrix(size, (row, col) => ({
    row,
    col,
    value: board[row][col],
  })).flat();

  const rowRemaining = [...rowTargets];
  const colRemaining = [...colTargets];
  const rowUndecided = Array.from({ length: size }, (_, row) =>
    Array.from({ length: size }, (_, col) => board[row][col]),
  );
  const colUndecided = Array.from({ length: size }, (_, col) =>
    Array.from({ length: size }, (_, row) => board[row][col]),
  );

  const decision = createMatrix<null | boolean>(size, () => null);
  let solutions = 0;

  const isStatePossible = (rowsToCheck?: number[], colsToCheck?: number[]) => {
    const touchedRows = rowsToCheck ?? rowRemaining.map((_, index) => index);
    const touchedCols = colsToCheck ?? colRemaining.map((_, index) => index);

    return (
      touchedRows.every(
        (row) =>
          rowRemaining[row] >= 1 &&
          canMakeProduct(rowUndecided[row], rowRemaining[row]),
      ) &&
      touchedCols.every(
        (col) =>
          colRemaining[col] >= 1 &&
          canMakeProduct(colUndecided[col], colRemaining[col]),
      )
    );
  };

  const removeUndecidedValue = (values: number[], value: number) => {
    const index = values.indexOf(value);

    if (index >= 0) {
      values.splice(index, 1);
    }
  };

  const addUndecidedValue = (values: number[], value: number) => {
    values.push(value);
  };

  const chooseCell = () => {
    let best: { cell: SolverCell; options: boolean[] } | null = null;

    for (const cell of cells) {
      if (decision[cell.row][cell.col] !== null) {
        continue;
      }

      const options: boolean[] = [false];
      if (
        rowRemaining[cell.row] % cell.value === 0 &&
        colRemaining[cell.col] % cell.value === 0
      ) {
        options.push(true);
      }

      if (!best || options.length < best.options.length) {
        best = { cell, options };
      }

      if (best.options.length === 1) {
        break;
      }
    }

    return best;
  };

  const visit = () => {
    if (solutions >= maxSolutions) {
      return;
    }

    const next = chooseCell();

    if (!next) {
      if (
        rowRemaining.every((value) => value === 1) &&
        colRemaining.every((value) => value === 1)
      ) {
        solutions += 1;
      }

      return;
    }

    const { cell, options } = next;
    removeUndecidedValue(rowUndecided[cell.row], cell.value);
    removeUndecidedValue(colUndecided[cell.col], cell.value);

    for (const selectCell of options) {
      if (selectCell) {
        rowRemaining[cell.row] /= cell.value;
        colRemaining[cell.col] /= cell.value;
      }

      decision[cell.row][cell.col] = selectCell;

      if (isStatePossible([cell.row], [cell.col])) {
        visit();
      }

      decision[cell.row][cell.col] = null;

      if (selectCell) {
        rowRemaining[cell.row] *= cell.value;
        colRemaining[cell.col] *= cell.value;
      }
    }

    addUndecidedValue(rowUndecided[cell.row], cell.value);
    addUndecidedValue(colUndecided[cell.col], cell.value);
  };

  if (!isStatePossible()) {
    return 0;
  }

  visit();
  return solutions;
}

function buildSolution(config: DifficultyConfig) {
  const size = config.size;
  const solution = createMatrix(size, () => false);
  const rowCounts = Array.from({ length: size }, () => 0);
  const colCounts = Array.from({ length: size }, () => 0);

  for (let row = 0; row < size; row += 1) {
    const desired = randomInt(config.minSelectedPerRow, config.maxSelectedPerRow);
    const picks = shuffle(Array.from({ length: size }, (_, index) => index)).slice(0, desired);

    for (const col of picks) {
      solution[row][col] = true;
      rowCounts[row] += 1;
      colCounts[col] += 1;
    }
  }

  for (let col = 0; col < size; col += 1) {
    if (colCounts[col] > 0) {
      continue;
    }

    const candidateRows = shuffle(
      Array.from({ length: size }, (_, row) => row).filter(
        (row) => rowCounts[row] < config.maxSelectedPerRow,
      ),
    );
    const row = candidateRows[0] ?? randomInt(0, size - 1);

    if (!solution[row][col]) {
      solution[row][col] = true;
      rowCounts[row] += 1;
      colCounts[col] += 1;
    }
  }

  return solution;
}

function buildBoard(config: DifficultyConfig, solution: boolean[][]) {
  const selectedValues = createValueRange(config.selectedRange);
  const fillerValues = createValueRange(config.fillerRange);
  const minSelectedValue = config.selectedRange[0];
  const maxDivisorCount = Math.max(...selectedValues.map(getDivisorCount));
  const rowProducts = Array.from({ length: config.size }, () => 1);
  const colProducts = Array.from({ length: config.size }, () => 1);
  const rowRemaining = solution.map((line) => line.filter(Boolean).length);
  const colRemaining = Array.from({ length: config.size }, (_, col) =>
    solution.reduce((count, line) => count + (line[col] ? 1 : 0), 0),
  );
  const board = createMatrix(config.size, () => 0);

  const fitsCap = (currentProduct: number, nextValue: number, remainingSlots: number) =>
    currentProduct * nextValue * minSelectedValue ** remainingSlots <= config.maxTarget;

  const pickSelectedValue = (
    row: number,
    col: number,
    rowSlotsLeft: number,
    colSlotsLeft: number,
  ) => {
    const candidates = selectedValues
      .filter(
        (value) =>
          fitsCap(rowProducts[row], value, rowSlotsLeft) &&
          fitsCap(colProducts[col], value, colSlotsLeft),
      )
      .map((value) => {
        const span = Math.max(1, config.selectedRange[1] - config.selectedRange[0]);
        const normalizedValue = (value - config.selectedRange[0]) / span;
        const highValueBoost = 1 + normalizedValue * config.highValueWeight;
        const divisorCount = getDivisorCount(value);
        const rarityBoost =
          1 +
          ((maxDivisorCount - divisorCount) / Math.max(1, maxDivisorCount - 2)) *
            config.primeWeight;
        const primeBoost = isPrime(value) ? 1 + config.primeWeight * 0.2 : 1;
        const idealValue = Math.min(
          config.selectedRange[1],
          Math.min(
            (config.maxTarget / rowProducts[row]) ** (1 / (rowSlotsLeft + 1)),
            (config.maxTarget / colProducts[col]) ** (1 / (colSlotsLeft + 1)),
          ),
        );
        const fitBoost =
          1 + Math.max(0, 1 - Math.abs(value - idealValue) / Math.max(1, idealValue));

        return {
          value,
          weight: highValueBoost * rarityBoost * primeBoost * fitBoost,
        };
      });

    if (candidates.length === 0) {
      return null;
    }

    return sampleWeighted(candidates);
  };

  const selectedCells = shuffle(
    createMatrix(config.size, (row, col) => ({ row, col }))
      .flat()
      .filter(({ row, col }) => solution[row][col]),
  );

  for (const { row, col } of selectedCells) {
    rowRemaining[row] -= 1;
    colRemaining[col] -= 1;

    const value = pickSelectedValue(row, col, rowRemaining[row], colRemaining[col]);

    if (value === null) {
      return null;
    }

    board[row][col] = value;
    rowProducts[row] *= value;
    colProducts[col] *= value;
  }

  for (let row = 0; row < config.size; row += 1) {
    for (let col = 0; col < config.size; col += 1) {
      if (!solution[row][col]) {
        board[row][col] = sample(fillerValues);
      }
    }
  }

  return board;
}

function isPuzzleBalanced(board: number[][], solution: boolean[][], config: DifficultyConfig) {
  const { rowTargets, colTargets } = getLineProducts(board, solution);
  const cellCount = config.size * config.size;
  const selectedCount = solution.flat().filter(Boolean).length;

  return (
    selectedCount > config.size &&
    selectedCount < Math.floor(cellCount * 0.68) &&
    rowTargets.every((target) => target > 1 && target <= config.maxTarget) &&
    colTargets.every((target) => target > 1 && target <= config.maxTarget)
  );
}

function createRevealedMarks(solution: boolean[][], requestedCount: number) {
  if (requestedCount <= 0) {
    return [];
  }

  const preferred = shuffle(
    solution
      .flatMap((line, row) =>
        line.map((selected, col) => ({
          row,
          col,
          selected,
        })),
      )
      .sort((left, right) => Number(right.selected) - Number(left.selected)),
  );

  return preferred.slice(0, Math.min(requestedCount, preferred.length)).map((cell) => ({
    row: cell.row,
    col: cell.col,
    mark: cell.selected ? ("selected" as const) : ("erased" as const),
  }));
}

function createHiddenTargets(size: number, count: number): HiddenTarget[] {
  if (count <= 0) {
    return [];
  }

  const rows = shuffle(
    Array.from({ length: size }, (_, index) => ({
      axis: "row" as const,
      index,
    })),
  );
  const cols = shuffle(
    Array.from({ length: size }, (_, index) => ({
      axis: "column" as const,
      index,
    })),
  );

  return shuffle([...rows.slice(0, count), ...cols.slice(0, count)]).slice(0, count).map((target) => ({
    ...target,
    revealAfterMarks: Math.min(3, Math.max(2, Math.ceil(size / 2))),
  }));
}

export function createPuzzle(level: number, difficulty: DifficultyId): Puzzle {
  const config = DIFFICULTIES[difficulty];
  const blueprint = getLevelBlueprint(difficulty, level);

  for (let attempt = 0; attempt < GENERATOR_TRIES; attempt += 1) {
    const solution = buildSolution(config);
    const board = buildBoard(config, solution);

    if (!board) {
      continue;
    }

    if (!isPuzzleBalanced(board, solution, config)) {
      continue;
    }

    const { rowTargets, colTargets } = getLineProducts(board, solution);
    const solutionCount = countSolutions(board, rowTargets, colTargets);

    if (solutionCount !== 1) {
      continue;
    }

    return {
      id: `${difficulty}-${level}-${Date.now()}-${attempt}`,
      level,
      difficulty,
      size: config.size,
      board,
      solution,
      rowTargets,
      colTargets,
      modifiers: blueprint.modifiers.map((id) => ({
        id,
        ...MODIFIER_DETAILS[id],
      })),
      missions: blueprint.missions.map((id) => ({
        id,
        ...MISSION_DETAILS[id],
      })),
      revealedMarks: createRevealedMarks(solution, blueprint.lockedCells ?? 0),
      hiddenTargets: createHiddenTargets(config.size, blueprint.hiddenTargets ?? 0),
      initialMode: blueprint.lockMode,
      toolUnlockCorrectMarks: blueprint.toolUnlockCorrectMarks,
      maxHearts: blueprint.maxHearts,
      chapter: blueprint.chapter,
      bandLabel: blueprint.bandLabel,
    };
  }

  throw new Error(`Unable to generate a unique ${difficulty} puzzle.`);
}

export function createEmptyMarks(size: number) {
  return createMatrix<CellMark>(size, () => "hidden");
}

export function applyRevealedMarks(
  marks: CellMark[][],
  revealedMarks: RevealedCell[] | undefined,
) {
  if (!revealedMarks?.length) {
    return marks;
  }

  const nextMarks = marks.map((line) => [...line]);

  for (const revealed of revealedMarks) {
    nextMarks[revealed.row][revealed.col] = revealed.mark;
  }

  return nextMarks;
}

export function isCellLocked(puzzle: Puzzle, row: number, col: number) {
  return (
    puzzle.revealedMarks?.some(
      (revealed) => revealed.row === row && revealed.col === col,
    ) ?? false
  );
}

export function getRowProgress(puzzle: Puzzle, marks: CellMark[][], row: number) {
  return product(
    puzzle.board[row].filter(
      (_, col) =>
        marks[row][col] === "selected" && puzzle.solution[row][col],
    ),
  );
}

export function getColProgress(puzzle: Puzzle, marks: CellMark[][], col: number) {
  return product(
    puzzle.board
      .map((line, row) => ({
        value: line[col],
        mark: marks[row][col],
        selected: puzzle.solution[row][col],
      }))
      .filter((cell) => cell.mark === "selected" && cell.selected)
      .map((cell) => cell.value),
  );
}

export function isRowResolved(puzzle: Puzzle, marks: CellMark[][], row: number) {
  return puzzle.board[row].every((_, col) => {
    const selected = puzzle.solution[row][col];
    return selected ? marks[row][col] === "selected" : marks[row][col] === "erased";
  });
}

export function isColResolved(puzzle: Puzzle, marks: CellMark[][], col: number) {
  return puzzle.board.every((_, row) => {
    const selected = puzzle.solution[row][col];
    return selected ? marks[row][col] === "selected" : marks[row][col] === "erased";
  });
}

export function getResolvedLineCount(puzzle: Puzzle, marks: CellMark[][]) {
  const rows = Array.from({ length: puzzle.size }, (_, row) =>
    isRowResolved(puzzle, marks, row),
  ).filter(Boolean).length;
  const cols = Array.from({ length: puzzle.size }, (_, col) =>
    isColResolved(puzzle, marks, col),
  ).filter(Boolean).length;

  return rows + cols;
}

export function getCorrectMarkCount(puzzle: Puzzle, marks: CellMark[][]) {
  let total = 0;

  for (let row = 0; row < puzzle.size; row += 1) {
    for (let col = 0; col < puzzle.size; col += 1) {
      const mark = marks[row][col];

      if (mark === "hidden") {
        continue;
      }

      const expected = puzzle.solution[row][col] ? "selected" : "erased";

      if (mark === expected) {
        total += 1;
      }
    }
  }

  return total;
}

export function getMarksCommittedOnLine(
  puzzle: Puzzle,
  marks: CellMark[][],
  axis: TargetAxis,
  index: number,
) {
  if (axis === "row") {
    return puzzle.board[index].filter((_, col) => marks[index][col] !== "hidden").length;
  }

  return puzzle.board.filter((_, row) => marks[row][index] !== "hidden").length;
}

export function isTargetHidden(
  puzzle: Puzzle,
  marks: CellMark[][],
  axis: TargetAxis,
  index: number,
) {
  const hiddenTarget = puzzle.hiddenTargets?.find(
    (target) => target.axis === axis && target.index === index,
  );

  if (!hiddenTarget) {
    return false;
  }

  return getMarksCommittedOnLine(puzzle, marks, axis, index) < hiddenTarget.revealAfterMarks;
}

export function getVisibleTarget(
  puzzle: Puzzle,
  marks: CellMark[][],
  axis: TargetAxis,
  index: number,
) {
  if (isTargetHidden(puzzle, marks, axis, index)) {
    return null;
  }

  return axis === "row" ? puzzle.rowTargets[index] : puzzle.colTargets[index];
}

export function areAllRowsResolved(puzzle: Puzzle, marks: CellMark[][]) {
  return Array.from({ length: puzzle.size }, (_, row) => isRowResolved(puzzle, marks, row)).every(Boolean);
}

export function areAllRowTargetsMet(puzzle: Puzzle, marks: CellMark[][]) {
  return Array.from({ length: puzzle.size }, (_, row) =>
    getRowProgress(puzzle, marks, row) === puzzle.rowTargets[row],
  ).every(Boolean);
}

export function isPuzzleSolved(puzzle: Puzzle, marks: CellMark[][]) {
  return marks.every((line, row) =>
    line.every((mark, col) =>
      puzzle.solution[row][col] ? mark === "selected" : mark === "erased",
    ),
  );
}

export function revealHint(
  puzzle: Puzzle,
  marks: CellMark[][],
): { row: number; col: number; mark: CellMark } | null {
  const candidates = shuffle(
    marks.flatMap((line, row) =>
      line
        .map((mark, col) => ({ row, col, mark }))
        .filter(({ mark }) => mark === "hidden")
        .filter(({ row: candidateRow, col: candidateCol }) =>
          !isCellLocked(puzzle, candidateRow, candidateCol),
        ),
    ),
  );

  const choice = candidates[0];

  if (!choice) {
    return null;
  }

  return {
    row: choice.row,
    col: choice.col,
    mark: puzzle.solution[choice.row][choice.col] ? "selected" : "erased",
  };
}
