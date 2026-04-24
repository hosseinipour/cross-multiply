import {
  getLevelBlueprint,
  MISSION_DETAILS,
  MODIFIER_DETAILS,
  type LevelBlueprint,
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
  reveal:
    | {
        kind: "marks";
        threshold: number;
      }
    | {
        kind: "matchedOrResolved";
      };
};

export type CrossBlind = {
  hiddenAxis: TargetAxis;
  unlockAfterMatchedVisibleLines: number;
};

export type DelayedCell = {
  row: number;
  col: number;
};

export type DelayedCellGroup = {
  cells: DelayedCell[];
  unlockAfterCorrectMarks: number;
};

export type SpotlightLine = {
  axis: TargetAxis;
  index: number;
  requiredCorrectMarks: number;
};

export type HintGate = {
  unlockAfterCorrectMarks: number;
};

export type QuietProgressTarget = {
  axis: TargetAxis;
  index: number;
};

export type NoEcho = {
  axis: TargetAxis;
};

export type FactorCipher = {
  axis: TargetAxis;
  unlockAfterMatchedOppositeTargets: number;
};

export type CommitLine = {
  axis: TargetAxis;
  checkpoint: number;
};

export type ToolLock = {
  initialMode: ToolMode;
  unlock: "visibleTargetMatched";
};

export type ActiveCommitment = {
  axis: TargetAxis;
  index: number;
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
  crossBlind?: CrossBlind;
  commitLine?: CommitLine;
  toolLock?: ToolLock;
  sealedCells?: DelayedCellGroup;
  spotlightLine?: SpotlightLine;
  hintGate?: HintGate;
  quietProgressTargets?: QuietProgressTarget[];
  noEcho?: NoEcho;
  cloakedCells?: DelayedCellGroup;
  factorCipher?: FactorCipher;
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
const LIMITED_HEART_DIFFICULTIES = new Set<DifficultyId>([
  "hard",
  "expert",
  "mythic",
]);
const MODIFIER_CHANCES: Record<
  ModifierId,
  Partial<Record<DifficultyId, number>>
> = {
  lockedCells: {
    easy: 0.72,
    medium: 0.68,
    hard: 0.58,
  },
  limitedErrors: {
    hard: 1,
    expert: 1,
    mythic: 1,
  },
  foggedTargets: {
    easy: 0.48,
    medium: 0.55,
    hard: 0.58,
    expert: 0.52,
    mythic: 0.48,
  },
  deepFog: {
    hard: 0.5,
    expert: 0.48,
    mythic: 0.42,
  },
  commitLine: {
    medium: 0.42,
    hard: 0.44,
    expert: 0.38,
    mythic: 0.32,
  },
  toolLock: {
    medium: 0.42,
    hard: 0.42,
    expert: 0.35,
    mythic: 0.3,
  },
  crossBlind: {
    expert: 0.34,
    mythic: 0.3,
  },
  sealedCells: {
    easy: 0.38,
    medium: 0.42,
    hard: 0.44,
    expert: 0.38,
    mythic: 0.32,
  },
  spotlightLine: {
    easy: 0.36,
    medium: 0.4,
    hard: 0.38,
    expert: 0.32,
    mythic: 0.28,
  },
  hintGate: {
    easy: 0.34,
    medium: 0.38,
    hard: 0.4,
    expert: 0.34,
    mythic: 0.3,
  },
  quietProgress: {
    expert: 0.32,
    mythic: 0.28,
  },
  noEcho: {
    expert: 0.28,
    mythic: 0.24,
  },
  cloakedCells: {
    mythic: 0.22,
  },
  factorCipher: {
    mythic: 0.16,
  },
};
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

function pickDistributedCell(
  candidates: { row: number; col: number; selected: boolean }[],
  chosen: { row: number; col: number; selected: boolean }[],
) {
  const shuffled = shuffle(candidates);
  let best = shuffled[0] ?? null;
  let bestScore = -1;

  for (const candidate of shuffled) {
    const alreadyChosen = chosen.some(
      (cell) => cell.row === candidate.row && cell.col === candidate.col,
    );

    if (alreadyChosen) {
      continue;
    }

    const rowUnused = chosen.every((cell) => cell.row !== candidate.row) ? 1 : 0;
    const colUnused = chosen.every((cell) => cell.col !== candidate.col) ? 1 : 0;
    const score = rowUnused + colUnused;

    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  return best;
}

function createRevealedMarks(solution: boolean[][], requestedCount: number) {
  if (requestedCount <= 0) {
    return [];
  }

  const allCells = solution.flatMap((line, row) =>
    line.map((selected, col) => ({
      row,
      col,
      selected,
    })),
  );
  const selectedCells = allCells.filter((cell) => cell.selected);
  const erasedCells = allCells.filter((cell) => !cell.selected);
  const chosen: typeof allCells = [];

  if (requestedCount >= 2 && selectedCells.length > 0 && erasedCells.length > 0) {
    const firstSelected = pickDistributedCell(selectedCells, chosen);
    if (firstSelected) {
      chosen.push(firstSelected);
    }

    const firstErased = pickDistributedCell(erasedCells, chosen);
    if (firstErased) {
      chosen.push(firstErased);
    }
  }

  const totalCount = Math.min(requestedCount, allCells.length);

  while (chosen.length < totalCount) {
    const nextCell = pickDistributedCell(allCells, chosen);

    if (!nextCell) {
      break;
    }

    chosen.push(nextCell);
  }

  return chosen.map((cell) => ({
    row: cell.row,
    col: cell.col,
    mark: cell.selected ? ("selected" as const) : ("erased" as const),
  }));
}

function createHiddenTargets(
  size: number,
  foggedCount: number,
  deepFogCount: number,
): HiddenTarget[] {
  if (foggedCount <= 0 && deepFogCount <= 0) {
    return [];
  }

  const targets = shuffle([
    ...Array.from({ length: size }, (_, index) => ({
      axis: "row" as const,
      index,
    })),
    ...Array.from({ length: size }, (_, index) => ({
      axis: "column" as const,
      index,
    })),
  ]);
  const hiddenTargets: HiddenTarget[] = [];
  const lightRevealThreshold = Math.min(3, Math.max(2, Math.ceil(size / 2)));

  for (const target of targets.slice(0, foggedCount)) {
    hiddenTargets.push({
      ...target,
      reveal: {
        kind: "marks",
        threshold: lightRevealThreshold,
      },
    });
  }

  for (const target of targets.slice(foggedCount, foggedCount + deepFogCount)) {
    hiddenTargets.push({
      ...target,
      reveal: {
        kind: "matchedOrResolved",
      },
    });
  }

  return hiddenTargets;
}

function createQuietProgressTargets(
  size: number,
  requestedCount: number,
  hiddenTargets: HiddenTarget[] = [],
  crossBlind?: CrossBlind,
): QuietProgressTarget[] {
  if (requestedCount <= 0) {
    return [];
  }

  const targets = [
    ...Array.from({ length: size }, (_, index) => ({
      axis: "row" as const,
      index,
    })),
    ...Array.from({ length: size }, (_, index) => ({
      axis: "column" as const,
      index,
    })),
  ];
  const notFogged = (target: QuietProgressTarget) =>
    !hiddenTargets.some(
      (hiddenTarget) =>
        hiddenTarget.axis === target.axis && hiddenTarget.index === target.index,
    );
  const visibleFirst = targets.filter(
    (target) => notFogged(target) && crossBlind?.hiddenAxis !== target.axis,
  );
  const fallback = targets.filter(notFogged);

  return shuffle(visibleFirst.length >= requestedCount ? visibleFirst : fallback).slice(
    0,
    requestedCount,
  );
}

function createDelayedCellGroup(
  size: number,
  requestedCount: number,
  unlockAfterCorrectMarks: number | undefined,
  blockedCells: DelayedCell[] = [],
): DelayedCellGroup | undefined {
  if (requestedCount <= 0 || !unlockAfterCorrectMarks) {
    return undefined;
  }

  const cells = shuffle(
    createMatrix(size, (row, col) => ({ row, col }))
      .flat()
      .filter(
        (cell) =>
          !blockedCells.some(
            (blocked) => blocked.row === cell.row && blocked.col === cell.col,
          ),
      ),
  ).slice(0, requestedCount);

  if (cells.length === 0) {
    return undefined;
  }

  return {
    cells,
    unlockAfterCorrectMarks,
  };
}

function createSpotlightLine(
  size: number,
  requiredCorrectMarks: number | undefined,
): SpotlightLine | undefined {
  if (!requiredCorrectMarks) {
    return undefined;
  }

  return {
    axis: sample(["row", "column"] as const),
    index: randomInt(0, size - 1),
    requiredCorrectMarks,
  };
}

function createNoEcho(axis: LevelBlueprint["noEchoAxis"]): NoEcho | undefined {
  if (!axis) {
    return undefined;
  }

  return {
    axis: axis === "random" ? sample(["row", "column"] as const) : axis,
  };
}

function resolveLimitedHeartModifier(
  blueprint: LevelBlueprint,
  roll: number,
): LevelBlueprint {
  if (!LIMITED_HEART_DIFFICULTIES.has(blueprint.difficulty)) {
    return blueprint;
  }

  const baseModifiers = blueprint.modifiers.filter(
    (modifier) => modifier !== "limitedErrors",
  );

  if (roll < 0.4) {
    return {
      ...blueprint,
      modifiers: baseModifiers,
      maxHearts: 3,
    };
  }

  if (roll < 0.8) {
    return {
      ...blueprint,
      modifiers: ["limitedErrors", ...baseModifiers],
      maxHearts: 2,
    };
  }

  return {
    ...blueprint,
    modifiers: ["limitedErrors"],
    maxHearts: 1,
    lockedCells: undefined,
    foggedTargets: undefined,
    deepFogTargets: undefined,
    toolLockMode: undefined,
    commitLineCheckpoint: undefined,
    crossBlindUnlockAfterMatchedVisibleLines: undefined,
    sealedCells: undefined,
    sealedCellsUnlockAfterCorrectMarks: undefined,
    spotlightLineCorrectMarks: undefined,
    hintGateUnlockAfterCorrectMarks: undefined,
    quietProgressTargets: undefined,
    noEchoAxis: undefined,
    cloakedCells: undefined,
    cloakedCellsUnlockAfterCorrectMarks: undefined,
    factorCipherUnlockAfterMatchedOppositeTargets: undefined,
  };
}

function getModifierRoll(
  modifier: ModifierId,
  rolls: Partial<Record<ModifierId, number>> | undefined,
) {
  return rolls?.[modifier] ?? Math.random();
}

function clearInactiveModifierMetadata(blueprint: LevelBlueprint): LevelBlueprint {
  const active = new Set(blueprint.modifiers);

  return {
    ...blueprint,
    lockedCells: active.has("lockedCells") ? blueprint.lockedCells : undefined,
    foggedTargets: active.has("foggedTargets")
      ? blueprint.foggedTargets
      : undefined,
    deepFogTargets: active.has("deepFog") ? blueprint.deepFogTargets : undefined,
    toolLockMode: active.has("toolLock") ? blueprint.toolLockMode : undefined,
    commitLineCheckpoint: active.has("commitLine")
      ? blueprint.commitLineCheckpoint
      : undefined,
    crossBlindUnlockAfterMatchedVisibleLines: active.has("crossBlind")
      ? blueprint.crossBlindUnlockAfterMatchedVisibleLines
      : undefined,
    sealedCells: active.has("sealedCells") ? blueprint.sealedCells : undefined,
    sealedCellsUnlockAfterCorrectMarks: active.has("sealedCells")
      ? blueprint.sealedCellsUnlockAfterCorrectMarks
      : undefined,
    spotlightLineCorrectMarks: active.has("spotlightLine")
      ? blueprint.spotlightLineCorrectMarks
      : undefined,
    hintGateUnlockAfterCorrectMarks: active.has("hintGate")
      ? blueprint.hintGateUnlockAfterCorrectMarks
      : undefined,
    quietProgressTargets: active.has("quietProgress")
      ? blueprint.quietProgressTargets
      : undefined,
    noEchoAxis: active.has("noEcho") ? blueprint.noEchoAxis : undefined,
    cloakedCells: active.has("cloakedCells") ? blueprint.cloakedCells : undefined,
    cloakedCellsUnlockAfterCorrectMarks: active.has("cloakedCells")
      ? blueprint.cloakedCellsUnlockAfterCorrectMarks
      : undefined,
    factorCipherUnlockAfterMatchedOppositeTargets: active.has("factorCipher")
      ? blueprint.factorCipherUnlockAfterMatchedOppositeTargets
      : undefined,
  };
}

function resolveRandomModifierActivation(
  blueprint: LevelBlueprint,
  rolls?: Partial<Record<ModifierId, number>>,
): LevelBlueprint {
  const modifiers = blueprint.modifiers.filter((modifier) => {
    if (modifier === "limitedErrors") {
      return true;
    }

    const chance = MODIFIER_CHANCES[modifier][blueprint.difficulty] ?? 0;
    return getModifierRoll(modifier, rolls) < chance;
  });

  return clearInactiveModifierMetadata({
    ...blueprint,
    modifiers,
  });
}

export function createPuzzle(
  level: number,
  difficulty: DifficultyId,
  options: {
    limitedHeartRoll?: number;
    modifierRolls?: Partial<Record<ModifierId, number>>;
  } = {},
): Puzzle {
  const config = DIFFICULTIES[difficulty];
  const blueprint = resolveRandomModifierActivation(
    resolveLimitedHeartModifier(
      getLevelBlueprint(difficulty, level),
      options.limitedHeartRoll ?? Math.random(),
    ),
    options.modifierRolls,
  );

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

    const revealedMarks = createRevealedMarks(solution, blueprint.lockedCells ?? 0);
    const hiddenTargets = createHiddenTargets(
      config.size,
      blueprint.foggedTargets ?? 0,
      blueprint.deepFogTargets ?? 0,
    );
    const crossBlind = blueprint.crossBlindUnlockAfterMatchedVisibleLines
      ? {
          hiddenAxis: sample(["row", "column"] as const),
          unlockAfterMatchedVisibleLines:
            blueprint.crossBlindUnlockAfterMatchedVisibleLines,
        }
      : undefined;
    const sealedCells = createDelayedCellGroup(
      config.size,
      blueprint.sealedCells ?? 0,
      blueprint.sealedCellsUnlockAfterCorrectMarks,
      revealedMarks,
    );
    const cloakedCells = createDelayedCellGroup(
      config.size,
      blueprint.cloakedCells ?? 0,
      blueprint.cloakedCellsUnlockAfterCorrectMarks,
      [...revealedMarks, ...(sealedCells?.cells ?? [])],
    );

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
      revealedMarks,
      hiddenTargets,
      crossBlind,
      commitLine: blueprint.commitLineCheckpoint
        ? {
            axis: sample(["row", "column"] as const),
            checkpoint: blueprint.commitLineCheckpoint,
          }
        : undefined,
      toolLock: blueprint.toolLockMode
        ? {
            initialMode: blueprint.toolLockMode,
            unlock: "visibleTargetMatched",
          }
        : undefined,
      sealedCells,
      spotlightLine: createSpotlightLine(
        config.size,
        blueprint.spotlightLineCorrectMarks,
      ),
      hintGate: blueprint.hintGateUnlockAfterCorrectMarks
        ? {
            unlockAfterCorrectMarks: blueprint.hintGateUnlockAfterCorrectMarks,
          }
        : undefined,
      quietProgressTargets: createQuietProgressTargets(
        config.size,
        blueprint.quietProgressTargets ?? 0,
        hiddenTargets,
        crossBlind,
      ),
      noEcho: createNoEcho(blueprint.noEchoAxis),
      cloakedCells,
      factorCipher: blueprint.factorCipherUnlockAfterMatchedOppositeTargets
        ? {
            axis: sample(["row", "column"] as const),
            unlockAfterMatchedOppositeTargets:
              blueprint.factorCipherUnlockAfterMatchedOppositeTargets,
          }
        : undefined,
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

export function isLineTargetMatched(
  puzzle: Puzzle,
  marks: CellMark[][],
  axis: TargetAxis,
  index: number,
) {
  const target = axis === "row" ? puzzle.rowTargets[index] : puzzle.colTargets[index];
  const progress =
    axis === "row"
      ? getRowProgress(puzzle, marks, index)
      : getColProgress(puzzle, marks, index);

  return progress === target;
}

export function countMatchedTargetsOnAxis(
  puzzle: Puzzle,
  marks: CellMark[][],
  axis: TargetAxis,
) {
  return Array.from(
    {
      length: axis === "row" ? puzzle.rowTargets.length : puzzle.colTargets.length,
    },
    (_, index) => isLineTargetMatched(puzzle, marks, axis, index),
  ).filter(Boolean).length;
}

export function getCorrectMarkCount(puzzle: Puzzle, marks: CellMark[][]) {
  let total = 0;

  for (let row = 0; row < puzzle.size; row += 1) {
    for (let col = 0; col < puzzle.size; col += 1) {
      const mark = marks[row][col];

      if (mark === "hidden") {
        continue;
      }

      if (isCellLocked(puzzle, row, col)) {
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

function delayedGroupIncludes(
  group: DelayedCellGroup | undefined,
  row: number,
  col: number,
) {
  return (
    group?.cells.some((cell) => cell.row === row && cell.col === col) ?? false
  );
}

function isDelayedGroupUnlocked(
  puzzle: Puzzle,
  marks: CellMark[][],
  group: DelayedCellGroup | undefined,
) {
  if (!group) {
    return true;
  }

  return getCorrectMarkCount(puzzle, marks) >= group.unlockAfterCorrectMarks;
}

export function isCellSealed(
  puzzle: Puzzle,
  marks: CellMark[][],
  row: number,
  col: number,
) {
  return (
    delayedGroupIncludes(puzzle.sealedCells, row, col) &&
    !isDelayedGroupUnlocked(puzzle, marks, puzzle.sealedCells)
  );
}

export function isCellCloaked(
  puzzle: Puzzle,
  marks: CellMark[][],
  row: number,
  col: number,
) {
  return (
    delayedGroupIncludes(puzzle.cloakedCells, row, col) &&
    !isDelayedGroupUnlocked(puzzle, marks, puzzle.cloakedCells)
  );
}

export function isCellDelayed(
  puzzle: Puzzle,
  marks: CellMark[][],
  row: number,
  col: number,
) {
  return (
    isCellSealed(puzzle, marks, row, col) ||
    isCellCloaked(puzzle, marks, row, col)
  );
}

export function getDelayedCellProgress(
  puzzle: Puzzle,
  marks: CellMark[][],
  group: DelayedCellGroup | undefined,
) {
  if (!group) {
    return null;
  }

  return {
    current: Math.min(
      getCorrectMarkCount(puzzle, marks),
      group.unlockAfterCorrectMarks,
    ),
    required: group.unlockAfterCorrectMarks,
    unlocked: isDelayedGroupUnlocked(puzzle, marks, group),
  };
}

export function getCommittedLineCorrectMarks(
  puzzle: Puzzle,
  marks: CellMark[][],
  axis: TargetAxis,
  index: number,
) {
  let total = 0;

  if (axis === "row") {
    for (let col = 0; col < puzzle.size; col += 1) {
      const mark = marks[index][col];

      if (mark === "hidden") {
        continue;
      }

      const expected = puzzle.solution[index][col] ? "selected" : "erased";
      if (mark === expected) {
        total += 1;
      }
    }

    return total;
  }

  for (let row = 0; row < puzzle.size; row += 1) {
    const mark = marks[row][index];

    if (mark === "hidden") {
      continue;
    }

    const expected = puzzle.solution[row][index] ? "selected" : "erased";
    if (mark === expected) {
      total += 1;
    }
  }

  return total;
}

export function getSpotlightProgress(puzzle: Puzzle, marks: CellMark[][]) {
  if (!puzzle.spotlightLine) {
    return null;
  }

  const { axis, index, requiredCorrectMarks } = puzzle.spotlightLine;
  const current = Math.min(
    getCommittedLineCorrectMarks(puzzle, marks, axis, index),
    requiredCorrectMarks,
  );

  return {
    axis,
    index,
    current,
    required: requiredCorrectMarks,
    complete: current >= requiredCorrectMarks,
  };
}

export function isCellBlockedBySpotlight(
  puzzle: Puzzle,
  marks: CellMark[][],
  row: number,
  col: number,
) {
  const progress = getSpotlightProgress(puzzle, marks);

  if (!progress || progress.complete) {
    return false;
  }

  return progress.axis === "row" ? progress.index !== row : progress.index !== col;
}

function isLineMatchedOrResolved(
  puzzle: Puzzle,
  marks: CellMark[][],
  axis: TargetAxis,
  index: number,
) {
  const resolved =
    axis === "row" ? isRowResolved(puzzle, marks, index) : isColResolved(puzzle, marks, index);

  return resolved || isLineTargetMatched(puzzle, marks, axis, index);
}

export function getNextNoEchoLine(
  puzzle: Puzzle,
  marks: CellMark[][],
  current: ActiveCommitment | null,
  row?: number,
  col?: number,
) {
  if (!puzzle.noEcho) {
    return null;
  }

  const released =
    current &&
    isLineMatchedOrResolved(puzzle, marks, current.axis, current.index);

  if (released) {
    return null;
  }

  if (row === undefined || col === undefined) {
    return current;
  }

  const nextLine = {
    axis: puzzle.noEcho.axis,
    index: puzzle.noEcho.axis === "row" ? row : col,
  };

  return isLineMatchedOrResolved(puzzle, marks, nextLine.axis, nextLine.index)
    ? null
    : nextLine;
}

export function isCellBlockedByNoEcho(
  noEchoLine: ActiveCommitment | null,
  row: number,
  col: number,
) {
  if (!noEchoLine) {
    return false;
  }

  return noEchoLine.axis === "row"
    ? noEchoLine.index === row
    : noEchoLine.index === col;
}

export function isHintGateUnlocked(puzzle: Puzzle, marks: CellMark[][]) {
  if (!puzzle.hintGate) {
    return true;
  }

  return (
    getCorrectMarkCount(puzzle, marks) >=
    puzzle.hintGate.unlockAfterCorrectMarks
  );
}

export function isProgressHidden(
  puzzle: Puzzle,
  marks: CellMark[][],
  axis: TargetAxis,
  index: number,
) {
  const quietModifierActive = puzzle.modifiers.some(
    (modifier) => modifier.id === "quietProgress",
  );
  const quiet = puzzle.quietProgressTargets?.some(
    (target) => target.axis === axis && target.index === index,
  );

  return (
    (quietModifierActive || Boolean(quiet)) &&
    !isLineMatchedOrResolved(puzzle, marks, axis, index)
  );
}

export function hasVisibleMatchedTarget(puzzle: Puzzle, marks: CellMark[][]) {
  const axes: TargetAxis[] = ["row", "column"];

  for (const axis of axes) {
    const lineCount = axis === "row" ? puzzle.rowTargets.length : puzzle.colTargets.length;

    for (let index = 0; index < lineCount; index += 1) {
      if (getVisibleTarget(puzzle, marks, axis, index) === null) {
        continue;
      }

      if (isLineTargetMatched(puzzle, marks, axis, index)) {
        return true;
      }
    }
  }

  return false;
}

export function getNextCommitment(
  puzzle: Puzzle,
  marks: CellMark[][],
  current: ActiveCommitment | null,
  row?: number,
  col?: number,
) {
  if (!puzzle.commitLine) {
    return null;
  }

  const nextCommitment =
    current ??
    (row !== undefined && col !== undefined
      ? {
          axis: puzzle.commitLine.axis,
          index: puzzle.commitLine.axis === "row" ? row : col,
        }
      : null);

  if (!nextCommitment) {
    return null;
  }

  const resolved =
    nextCommitment.axis === "row"
      ? isRowResolved(puzzle, marks, nextCommitment.index)
      : isColResolved(puzzle, marks, nextCommitment.index);
  const targetVisible =
    getVisibleTarget(puzzle, marks, nextCommitment.axis, nextCommitment.index) !== null;
  const matchedVisibleTarget =
    targetVisible &&
    isLineTargetMatched(puzzle, marks, nextCommitment.axis, nextCommitment.index);
  const checkpointReached =
    getCommittedLineCorrectMarks(
      puzzle,
      marks,
      nextCommitment.axis,
      nextCommitment.index,
    ) >= puzzle.commitLine.checkpoint;

  if (resolved || matchedVisibleTarget || checkpointReached) {
    return null;
  }

  return nextCommitment;
}

export function isCellBlockedByCommitment(
  commitment: ActiveCommitment | null,
  row: number,
  col: number,
) {
  if (!commitment) {
    return false;
  }

  return commitment.axis === "row"
    ? commitment.index !== row
    : commitment.index !== col;
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

function isCrossBlindAxisHidden(
  puzzle: Puzzle,
  marks: CellMark[][],
  axis: TargetAxis,
) {
  if (!puzzle.crossBlind || puzzle.crossBlind.hiddenAxis !== axis) {
    return false;
  }

  const visibleAxis = axis === "row" ? "column" : "row";
  return (
    countMatchedTargetsOnAxis(puzzle, marks, visibleAxis) <
    puzzle.crossBlind.unlockAfterMatchedVisibleLines
  );
}

export function isTargetHidden(
  puzzle: Puzzle,
  marks: CellMark[][],
  axis: TargetAxis,
  index: number,
) {
  if (isCrossBlindAxisHidden(puzzle, marks, axis)) {
    return true;
  }

  const hiddenTarget = puzzle.hiddenTargets?.find(
    (target) => target.axis === axis && target.index === index,
  );

  if (!hiddenTarget) {
    return false;
  }

  if (hiddenTarget.reveal.kind === "marks") {
    return (
      getMarksCommittedOnLine(puzzle, marks, axis, index) <
      hiddenTarget.reveal.threshold
    );
  }

  const resolved =
    axis === "row"
      ? isRowResolved(puzzle, marks, index)
      : isColResolved(puzzle, marks, index);

  return !isLineTargetMatched(puzzle, marks, axis, index) && !resolved;
}

export function getTargetConcealment(
  puzzle: Puzzle,
  marks: CellMark[][],
  axis: TargetAxis,
  index: number,
) {
  if (isCrossBlindAxisHidden(puzzle, marks, axis)) {
    return "blind" as const;
  }

  const hiddenTarget = puzzle.hiddenTargets?.find(
    (target) => target.axis === axis && target.index === index,
  );

  if (hiddenTarget && isTargetHidden(puzzle, marks, axis, index)) {
    return hiddenTarget.reveal.kind === "matchedOrResolved"
      ? ("deepFog" as const)
      : ("fog" as const);
  }

  return null;
}

export function isTargetCiphered(
  puzzle: Puzzle,
  marks: CellMark[][],
  axis: TargetAxis,
) {
  if (!puzzle.factorCipher || puzzle.factorCipher.axis !== axis) {
    return false;
  }

  const oppositeAxis = axis === "row" ? "column" : "row";

  return (
    countMatchedTargetsOnAxis(puzzle, marks, oppositeAxis) <
    puzzle.factorCipher.unlockAfterMatchedOppositeTargets
  );
}

export function getPrimeFactors(value: number) {
  const factors: number[] = [];
  let remaining = value;
  let divisor = 2;

  while (remaining > 1 && divisor * divisor <= remaining) {
    while (remaining % divisor === 0) {
      factors.push(divisor);
      remaining /= divisor;
    }

    divisor += divisor === 2 ? 1 : 2;
  }

  if (remaining > 1) {
    factors.push(remaining);
  }

  return factors;
}

export function getFactorCipherProgress(puzzle: Puzzle, marks: CellMark[][]) {
  if (!puzzle.factorCipher) {
    return null;
  }

  const oppositeAxis = puzzle.factorCipher.axis === "row" ? "column" : "row";
  const current = Math.min(
    countMatchedTargetsOnAxis(puzzle, marks, oppositeAxis),
    puzzle.factorCipher.unlockAfterMatchedOppositeTargets,
  );

  return {
    axis: puzzle.factorCipher.axis,
    oppositeAxis,
    current,
    required: puzzle.factorCipher.unlockAfterMatchedOppositeTargets,
    unlocked: current >= puzzle.factorCipher.unlockAfterMatchedOppositeTargets,
  };
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
  options: {
    activeCommitment?: ActiveCommitment | null;
    noEchoLine?: ActiveCommitment | null;
  } = {},
): { row: number; col: number; mark: CellMark } | null {
  const candidates = shuffle(
    marks.flatMap((line, row) =>
      line
        .map((mark, col) => ({ row, col, mark }))
        .filter(({ mark }) => mark === "hidden")
        .filter(({ row: candidateRow, col: candidateCol }) =>
          !isCellLocked(puzzle, candidateRow, candidateCol),
        )
        .filter(
          ({ row: candidateRow, col: candidateCol }) =>
            !isCellDelayed(puzzle, marks, candidateRow, candidateCol),
        )
        .filter(
          ({ row: candidateRow, col: candidateCol }) =>
            !isCellBlockedBySpotlight(
              puzzle,
              marks,
              candidateRow,
              candidateCol,
            ),
        )
        .filter(
          ({ row: candidateRow, col: candidateCol }) =>
            !isCellBlockedByCommitment(
              options.activeCommitment ?? null,
              candidateRow,
              candidateCol,
            ),
        )
        .filter(
          ({ row: candidateRow, col: candidateCol }) =>
            !isCellBlockedByNoEcho(
              options.noEchoLine ?? null,
              candidateRow,
              candidateCol,
            ),
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
