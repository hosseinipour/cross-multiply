import type { DifficultyId } from "./game";

export type ModifierId =
  | "lockedCells"
  | "limitedErrors"
  | "foggedTargets"
  | "deepFog"
  | "commitLine"
  | "toolLock"
  | "crossBlind";

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

export const CHAPTER_UNLOCKS: Partial<Record<DifficultyId, number>> = {
  medium: 8,
  hard: 9,
  expert: 10,
  mythic: 12,
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
          modifiers: ["lockedCells"],
          missions: ["flawless", "noHints"],
          lockedCells: 2,
        },
        {
          modifiers: ["lockedCells"],
          missions: ["flawless", "noHints"],
          lockedCells: 3,
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
          modifiers: ["foggedTargets"],
          missions: ["flawless", "noHints"],
          foggedTargets: 1,
        },
        {
          modifiers: ["lockedCells", "foggedTargets"],
          missions: ["flawless", "noHints"],
          lockedCells: 2,
          foggedTargets: 1,
        },
        {
          modifiers: ["foggedTargets"],
          missions: ["flawless", "noHints"],
          foggedTargets: 2,
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
          modifiers: ["lockedCells"],
          missions: ["flawless", "noHints"],
          lockedCells: 3,
        },
        {
          modifiers: ["foggedTargets"],
          missions: ["flawless", "noHints"],
          foggedTargets: 1,
        },
        {
          modifiers: ["toolLock"],
          missions: ["flawless", "rowRush"],
          toolLockMode: "select",
        },
        {
          modifiers: ["commitLine"],
          missions: ["flawless", "noHints"],
          commitLineCheckpoint: 3,
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
          modifiers: ["lockedCells", "foggedTargets"],
          missions: ["flawless", "noHints"],
          lockedCells: 2,
          foggedTargets: 1,
        },
        {
          modifiers: ["toolLock", "foggedTargets"],
          missions: ["flawless", "rowRush"],
          foggedTargets: 1,
          toolLockMode: "select",
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
          modifiers: ["limitedErrors", "deepFog"],
          missions: ["flawless", "noHints"],
          deepFogTargets: 2,
        },
        {
          modifiers: ["limitedErrors", "commitLine"],
          missions: ["flawless", "noHints"],
          commitLineCheckpoint: 3,
        },
        {
          modifiers: ["limitedErrors", "toolLock"],
          missions: ["flawless", "rowRush"],
          toolLockMode: "select",
        },
        {
          modifiers: ["limitedErrors", "lockedCells", "foggedTargets"],
          missions: ["flawless", "noHints"],
          lockedCells: 3,
          foggedTargets: 1,
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
          modifiers: ["limitedErrors", "deepFog", "lockedCells"],
          missions: ["flawless", "noHints"],
          deepFogTargets: 2,
          lockedCells: 4,
        },
        {
          modifiers: ["limitedErrors", "deepFog", "commitLine"],
          missions: ["flawless", "noHints"],
          deepFogTargets: 2,
          commitLineCheckpoint: 3,
        },
        {
          modifiers: ["limitedErrors", "toolLock", "foggedTargets"],
          missions: ["flawless", "rowRush"],
          foggedTargets: 1,
          toolLockMode: "select",
        },
        {
          modifiers: ["limitedErrors", "commitLine", "foggedTargets"],
          missions: ["flawless", "noHints"],
          foggedTargets: 1,
          commitLineCheckpoint: 3,
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
          modifiers: ["limitedErrors", "deepFog", "commitLine"],
          missions: ["flawless", "noHints"],
          deepFogTargets: 2,
          commitLineCheckpoint: 4,
        },
        {
          modifiers: ["limitedErrors", "crossBlind", "foggedTargets"],
          missions: ["flawless", "noHints"],
          foggedTargets: 1,
          crossBlindUnlockAfterMatchedVisibleLines: 2,
        },
        {
          modifiers: ["limitedErrors", "deepFog", "crossBlind"],
          missions: ["flawless", "noHints"],
          deepFogTargets: 2,
          crossBlindUnlockAfterMatchedVisibleLines: 2,
        },
        {
          modifiers: ["limitedErrors", "toolLock", "commitLine"],
          missions: ["flawless", "noHints"],
          toolLockMode: "select",
          commitLineCheckpoint: 4,
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
          modifiers: ["limitedErrors", "deepFog", "crossBlind", "commitLine"],
          missions: ["flawless", "noHints"],
          deepFogTargets: 3,
          crossBlindUnlockAfterMatchedVisibleLines: 3,
          commitLineCheckpoint: 4,
        },
        {
          modifiers: ["limitedErrors", "lockedCells", "deepFog", "commitLine"],
          missions: ["flawless", "noHints"],
          lockedCells: 5,
          deepFogTargets: 3,
          commitLineCheckpoint: 4,
        },
        {
          modifiers: ["limitedErrors", "lockedCells", "crossBlind", "foggedTargets"],
          missions: ["flawless", "noHints"],
          lockedCells: 5,
          foggedTargets: 2,
          crossBlindUnlockAfterMatchedVisibleLines: 3,
        },
        {
          modifiers: ["limitedErrors", "lockedCells", "deepFog", "toolLock"],
          missions: ["flawless", "rowRush"],
          lockedCells: 5,
          deepFogTargets: 3,
          toolLockMode: "select",
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
  return CHAPTER_UNLOCKS[difficulty] ?? 0;
}
