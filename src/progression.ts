import type { DifficultyId } from "./game";

export type ModifierId =
  | "lockedCells"
  | "limitedErrors"
  | "foggedTargets"
  | "deepFog"
  | "commitLine"
  | "toolLock"
  | "crossBlind"
  | "sealedCells"
  | "spotlightLine"
  | "hintGate"
  | "quietProgress"
  | "noEcho"
  | "cloakedCells"
  | "factorCipher";

export type MissionId = "flawless" | "noHints" | "rowRush";

export type LevelPreset = {
  modifiers: ModifierId[];
  missions: MissionId[];
  lockedCells?: number;
  foggedTargets?: number;
  deepFogTargets?: number;
  toolLockMode?: "select";
  commitLineCheckpoint?: number;
  crossBlindUnlockAfterMatchedVisibleLines?: number;
  sealedCells?: number;
  sealedCellsUnlockAfterCorrectMarks?: number;
  spotlightLineCorrectMarks?: number;
  hintGateUnlockAfterCorrectMarks?: number;
  quietProgressTargets?: number;
  noEchoAxis?: "row" | "column" | "random";
  cloakedCells?: number;
  cloakedCellsUnlockAfterCorrectMarks?: number;
  factorCipherUnlockAfterMatchedOppositeTargets?: number;
};

export type LevelBand = {
  from: number;
  to: number;
  chapter: string;
  bandLabel: string;
  maxHearts: number;
  presetCycle: LevelPreset[];
};

export type LevelBlueprint = LevelPreset & {
  difficulty: DifficultyId;
  level: number;
  chapter: string;
  bandLabel: string;
  maxHearts: number;
};

export const MODIFIER_DETAILS: Record<
  ModifierId,
  { title: string; short: string; description: string }
> = {
  lockedCells: {
    title: "Locked Cells",
    short: "Prefilled marks stay fixed.",
    description:
      "A few cells begin already confirmed. They anchor the solve, but you cannot change them.",
  },
  limitedErrors: {
    title: "Limited Errors",
    short: "Mistakes cost more.",
    description:
      "This chapter trims your heart budget, so each wrong read carries much more pressure.",
  },
  foggedTargets: {
    title: "Fogged Targets",
    short: "Some clues stay hidden.",
    description:
      "A few row or column products stay concealed until you commit enough marks on that exact line.",
  },
  deepFog: {
    title: "Deep Fog",
    short: "Blind lines stay blind.",
    description:
      "Some lines reveal nothing until you fully match their target or resolve the whole line.",
  },
  commitLine: {
    title: "Commit Line",
    short: "Finish what you started.",
    description:
      "Your first committed mark locks you onto that row or column until you hit a checkpoint or finish the line cleanly.",
  },
  toolLock: {
    title: "Tool Lock",
    short: "One tool starts sealed.",
    description:
      "You begin in select mode with erase locked. Switches unlock only after you match a visible target.",
  },
  crossBlind: {
    title: "Cross Blind",
    short: "One whole axis is hidden.",
    description:
      "All row or all column products begin concealed and only return after you match enough lines on the visible axis.",
  },
  sealedCells: {
    title: "Sealed Cells",
    short: "Some cells open after progress.",
    description:
      "A few visible cells start disabled, then unlock after you place enough correct marks anywhere on the board.",
  },
  spotlightLine: {
    title: "Spotlight Line",
    short: "Start on the lit line.",
    description:
      "One row or column starts highlighted. Place enough correct marks there before marking elsewhere.",
  },
  hintGate: {
    title: "Hint Gate",
    short: "Hints unlock after progress.",
    description:
      "Hints are unavailable at the start and unlock once you make early correct marks.",
  },
  quietProgress: {
    title: "Quiet Progress",
    short: "Some progress ticks stay hidden.",
    description:
      "Target badges hide their small running product until that line is matched or resolved.",
  },
  noEcho: {
    title: "No Echo",
    short: "Do not repeat the same line.",
    description:
      "After a correct mark on the chosen axis, your next mark must be on a different line unless the prior line is matched or resolved.",
  },
  cloakedCells: {
    title: "Cloaked Cells",
    short: "Cells hide until progress.",
    description:
      "Several cells hide their values and stay disabled until enough correct marks are made anywhere on the board.",
  },
  factorCipher: {
    title: "Factor Cipher",
    short: "Targets show factors first.",
    description:
      "One target axis displays prime-factor chips instead of normal numbers until enough opposite-axis targets are matched.",
  },
};

export const MISSION_DETAILS: Record<
  MissionId,
  { title: string; description: string }
> = {
  flawless: {
    title: "Flawless",
    description: "Clear the board without making any mistakes.",
  },
  noHints: {
    title: "No Hints",
    description: "Finish the puzzle without spending a hint.",
  },
  rowRush: {
    title: "Row Rush",
    description: "Resolve every row target before you ever switch into erase mode.",
  },
};

export type DifficultyUnlockRule = {
  source: DifficultyId;
  requiredClears: number;
};

export const CHAPTER_UNLOCKS: Partial<
  Record<DifficultyId, DifficultyUnlockRule>
> = {
  medium: {
    source: "easy",
    requiredClears: 1,
  },
  hard: {
    source: "easy",
    requiredClears: 1,
  },
  expert: {
    source: "hard",
    requiredClears: 10,
  },
  mythic: {
    source: "expert",
    requiredClears: 10,
  },
};

const PROGRESSION: Record<DifficultyId, LevelBand[]> = {
  easy: [
    {
      from: 1,
      to: 5,
      chapter: "Academy",
      bandLabel: "Warm-up Grid",
      maxHearts: 3,
      presetCycle: [
        {
          modifiers: [],
          missions: ["flawless", "noHints"],
        },
        {
          modifiers: ["hintGate"],
          missions: ["flawless", "noHints"],
          hintGateUnlockAfterCorrectMarks: 1,
        },
        {
          modifiers: ["sealedCells"],
          missions: ["flawless", "noHints"],
          sealedCells: 1,
          sealedCellsUnlockAfterCorrectMarks: 1,
        },
      ],
    },
    {
      from: 6,
      to: 10,
      chapter: "Academy",
      bandLabel: "Anchored Rows",
      maxHearts: 3,
      presetCycle: [
        {
          modifiers: ["lockedCells", "sealedCells"],
          missions: ["flawless", "noHints"],
          lockedCells: 2,
          sealedCells: 1,
          sealedCellsUnlockAfterCorrectMarks: 1,
        },
        {
          modifiers: ["lockedCells"],
          missions: ["flawless", "noHints"],
          lockedCells: 3,
        },
        {
          modifiers: ["spotlightLine"],
          missions: ["flawless", "noHints"],
          spotlightLineCorrectMarks: 1,
        },
      ],
    },
    {
      from: 11,
      to: Infinity,
      chapter: "Academy",
      bandLabel: "Veiled Signals",
      maxHearts: 3,
      presetCycle: [
        {
          modifiers: ["foggedTargets", "hintGate"],
          missions: ["flawless", "noHints"],
          foggedTargets: 1,
          hintGateUnlockAfterCorrectMarks: 1,
        },
        {
          modifiers: ["lockedCells", "foggedTargets", "sealedCells"],
          missions: ["flawless", "noHints"],
          lockedCells: 2,
          foggedTargets: 1,
          sealedCells: 1,
          sealedCellsUnlockAfterCorrectMarks: 1,
        },
        {
          modifiers: ["foggedTargets", "spotlightLine"],
          missions: ["flawless", "noHints"],
          foggedTargets: 2,
          spotlightLineCorrectMarks: 1,
        },
      ],
    },
  ],
  medium: [
    {
      from: 1,
      to: 4,
      chapter: "Workshop",
      bandLabel: "Controlled Starts",
      maxHearts: 3,
      presetCycle: [
        {
          modifiers: ["lockedCells", "sealedCells"],
          missions: ["flawless", "noHints"],
          lockedCells: 3,
          sealedCells: 2,
          sealedCellsUnlockAfterCorrectMarks: 2,
        },
        {
          modifiers: ["foggedTargets", "hintGate"],
          missions: ["flawless", "noHints"],
          foggedTargets: 1,
          hintGateUnlockAfterCorrectMarks: 2,
        },
        {
          modifiers: ["toolLock"],
          missions: ["flawless", "rowRush"],
          toolLockMode: "select",
        },
        {
          modifiers: ["spotlightLine"],
          missions: ["flawless", "noHints"],
          spotlightLineCorrectMarks: 2,
        },
      ],
    },
    {
      from: 5,
      to: Infinity,
      chapter: "Workshop",
      bandLabel: "Grinding Decisions",
      maxHearts: 3,
      presetCycle: [
        {
          modifiers: ["lockedCells", "foggedTargets", "hintGate"],
          missions: ["flawless", "noHints"],
          lockedCells: 2,
          foggedTargets: 1,
          hintGateUnlockAfterCorrectMarks: 2,
        },
        {
          modifiers: ["toolLock", "foggedTargets", "sealedCells"],
          missions: ["flawless", "rowRush"],
          foggedTargets: 1,
          toolLockMode: "select",
          sealedCells: 2,
          sealedCellsUnlockAfterCorrectMarks: 2,
        },
        {
          modifiers: ["commitLine", "lockedCells"],
          missions: ["flawless", "noHints"],
          lockedCells: 3,
          commitLineCheckpoint: 3,
        },
        {
          modifiers: ["toolLock", "commitLine"],
          missions: ["flawless", "noHints"],
          toolLockMode: "select",
          commitLineCheckpoint: 3,
        },
        {
          modifiers: ["spotlightLine", "foggedTargets"],
          missions: ["flawless", "noHints"],
          foggedTargets: 1,
          spotlightLineCorrectMarks: 2,
        },
      ],
    },
  ],
  hard: [
    {
      from: 1,
      to: 4,
      chapter: "Forge",
      bandLabel: "Pressure Build",
      maxHearts: 2,
      presetCycle: [
        {
          modifiers: ["limitedErrors", "deepFog", "hintGate"],
          missions: ["flawless", "noHints"],
          deepFogTargets: 2,
          hintGateUnlockAfterCorrectMarks: 3,
        },
        {
          modifiers: ["limitedErrors", "spotlightLine"],
          missions: ["flawless", "noHints"],
          spotlightLineCorrectMarks: 2,
        },
        {
          modifiers: ["limitedErrors", "toolLock", "sealedCells"],
          missions: ["flawless", "rowRush"],
          toolLockMode: "select",
          sealedCells: 3,
          sealedCellsUnlockAfterCorrectMarks: 3,
        },
        {
          modifiers: ["limitedErrors", "lockedCells", "foggedTargets", "hintGate"],
          missions: ["flawless", "noHints"],
          lockedCells: 3,
          foggedTargets: 1,
          hintGateUnlockAfterCorrectMarks: 3,
        },
      ],
    },
    {
      from: 5,
      to: Infinity,
      chapter: "Forge",
      bandLabel: "Blind Corners",
      maxHearts: 2,
      presetCycle: [
        {
          modifiers: ["limitedErrors", "deepFog", "lockedCells", "sealedCells"],
          missions: ["flawless", "noHints"],
          deepFogTargets: 2,
          lockedCells: 4,
          sealedCells: 3,
          sealedCellsUnlockAfterCorrectMarks: 3,
        },
        {
          modifiers: ["limitedErrors", "deepFog", "commitLine"],
          missions: ["flawless", "noHints"],
          deepFogTargets: 2,
          commitLineCheckpoint: 3,
        },
        {
          modifiers: ["limitedErrors", "toolLock", "foggedTargets", "hintGate"],
          missions: ["flawless", "rowRush"],
          foggedTargets: 1,
          toolLockMode: "select",
          hintGateUnlockAfterCorrectMarks: 3,
        },
        {
          modifiers: ["limitedErrors", "commitLine", "foggedTargets"],
          missions: ["flawless", "noHints"],
          foggedTargets: 1,
          commitLineCheckpoint: 3,
        },
        {
          modifiers: ["limitedErrors", "spotlightLine", "deepFog", "sealedCells"],
          missions: ["flawless", "noHints"],
          deepFogTargets: 2,
          sealedCells: 3,
          sealedCellsUnlockAfterCorrectMarks: 3,
          spotlightLineCorrectMarks: 2,
        },
      ],
    },
  ],
  expert: [
    {
      from: 1,
      to: Infinity,
      chapter: "Sanctum",
      bandLabel: "Hidden Framework",
      maxHearts: 1,
      presetCycle: [
        {
          modifiers: ["limitedErrors", "deepFog", "commitLine", "quietProgress"],
          missions: ["flawless", "noHints"],
          deepFogTargets: 2,
          commitLineCheckpoint: 4,
          quietProgressTargets: 2,
        },
        {
          modifiers: ["limitedErrors", "crossBlind", "foggedTargets", "hintGate", "quietProgress"],
          missions: ["flawless", "noHints"],
          foggedTargets: 1,
          crossBlindUnlockAfterMatchedVisibleLines: 2,
          hintGateUnlockAfterCorrectMarks: 4,
          quietProgressTargets: 2,
        },
        {
          modifiers: ["limitedErrors", "deepFog", "crossBlind", "noEcho", "sealedCells"],
          missions: ["flawless", "noHints"],
          deepFogTargets: 2,
          crossBlindUnlockAfterMatchedVisibleLines: 2,
          noEchoAxis: "random",
          sealedCells: 3,
          sealedCellsUnlockAfterCorrectMarks: 4,
        },
        {
          modifiers: ["limitedErrors", "toolLock", "commitLine", "quietProgress", "hintGate"],
          missions: ["flawless", "noHints"],
          toolLockMode: "select",
          commitLineCheckpoint: 4,
          quietProgressTargets: 2,
          hintGateUnlockAfterCorrectMarks: 4,
        },
        {
          modifiers: ["limitedErrors", "spotlightLine", "deepFog", "quietProgress"],
          missions: ["flawless", "noHints"],
          deepFogTargets: 2,
          spotlightLineCorrectMarks: 3,
          quietProgressTargets: 2,
        },
      ],
    },
  ],
  mythic: [
    {
      from: 1,
      to: Infinity,
      chapter: "Mythic",
      bandLabel: "Relentless Circuit",
      maxHearts: 1,
      presetCycle: [
        {
          modifiers: ["limitedErrors", "deepFog", "crossBlind", "commitLine", "quietProgress", "factorCipher"],
          missions: ["flawless", "noHints"],
          deepFogTargets: 3,
          crossBlindUnlockAfterMatchedVisibleLines: 3,
          commitLineCheckpoint: 4,
          quietProgressTargets: 3,
          factorCipherUnlockAfterMatchedOppositeTargets: 3,
        },
        {
          modifiers: ["limitedErrors", "cloakedCells", "deepFog", "noEcho", "factorCipher"],
          missions: ["flawless", "noHints"],
          cloakedCells: 4,
          cloakedCellsUnlockAfterCorrectMarks: 5,
          deepFogTargets: 3,
          noEchoAxis: "random",
          factorCipherUnlockAfterMatchedOppositeTargets: 3,
        },
        {
          modifiers: ["limitedErrors", "sealedCells", "crossBlind", "foggedTargets", "hintGate", "quietProgress", "factorCipher"],
          missions: ["flawless", "noHints"],
          sealedCells: 4,
          sealedCellsUnlockAfterCorrectMarks: 5,
          foggedTargets: 2,
          hintGateUnlockAfterCorrectMarks: 5,
          quietProgressTargets: 3,
          crossBlindUnlockAfterMatchedVisibleLines: 3,
          factorCipherUnlockAfterMatchedOppositeTargets: 3,
        },
        {
          modifiers: ["limitedErrors", "cloakedCells", "deepFog", "toolLock", "spotlightLine", "factorCipher"],
          missions: ["flawless", "rowRush"],
          cloakedCells: 4,
          cloakedCellsUnlockAfterCorrectMarks: 5,
          deepFogTargets: 3,
          toolLockMode: "select",
          spotlightLineCorrectMarks: 3,
          factorCipherUnlockAfterMatchedOppositeTargets: 3,
        },
      ],
    },
  ],
};

export function getLevelBlueprint(
  difficulty: DifficultyId,
  level: number,
): LevelBlueprint {
  const band =
    PROGRESSION[difficulty].find(
      (candidate) => level >= candidate.from && level <= candidate.to,
    ) ?? PROGRESSION[difficulty][PROGRESSION[difficulty].length - 1];

  const presetIndex = Math.max(0, level - band.from) % band.presetCycle.length;
  const preset = band.presetCycle[presetIndex];

  return {
    ...preset,
    difficulty,
    level,
    chapter: band.chapter,
    bandLabel: band.bandLabel,
    maxHearts: band.maxHearts,
  };
}

export function getDifficultyUnlockRequirement(difficulty: DifficultyId) {
  return CHAPTER_UNLOCKS[difficulty]?.requiredClears ?? 0;
}

export function getDifficultyUnlockSource(difficulty: DifficultyId) {
  return CHAPTER_UNLOCKS[difficulty]?.source ?? null;
}
