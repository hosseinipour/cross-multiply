import type { DifficultyId } from "./game";

export type ModifierId =
  | "lockedCells"
  | "limitedErrors"
  | "foggedTargets"
  | "oneWayTools"
  | "comboHintPenalty";

export type MissionId = "flawless" | "noHints" | "rowRush";

export type LevelBand = {
  from: number;
  to: number;
  chapter: string;
  bandLabel: string;
  maxHearts: number;
  modifiers: ModifierId[];
  missions: MissionId[];
  lockMode?: "select" | "erase";
  toolUnlockCorrectMarks?: number;
  lockedCells?: number;
  hiddenTargets?: number;
};

export type LevelBlueprint = LevelBand & {
  difficulty: DifficultyId;
  level: number;
};

export const MODIFIER_DETAILS: Record<
  ModifierId,
  { title: string; short: string; description: string }
> = {
  lockedCells: {
    title: "Locked Cells",
    short: "Prefilled marks stay fixed.",
    description:
      "A few cells begin already confirmed. Use them as anchors, but you cannot change them.",
  },
  limitedErrors: {
    title: "Limited Errors",
    short: "Mistakes cost more.",
    description:
      "This chapter trims your heart budget, so each misread matters more than usual.",
  },
  foggedTargets: {
    title: "Fogged Targets",
    short: "Some clues stay hidden.",
    description:
      "One or more row or column targets are concealed until you commit enough marks on that line.",
  },
  oneWayTools: {
    title: "One-Way Tools",
    short: "One tool starts locked.",
    description:
      "You begin with only one tool active. Make enough correct marks to unlock the second one.",
  },
  comboHintPenalty: {
    title: "Hint Tax",
    short: "Hints reduce rewards.",
    description:
      "Hints still help you finish, but they cap the level's star payout and make missions harder to perfect.",
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
      modifiers: [],
      missions: ["flawless", "noHints"],
    },
    {
      from: 6,
      to: 10,
      chapter: "Academy",
      bandLabel: "Anchored Rows",
      maxHearts: 3,
      modifiers: ["lockedCells"],
      missions: ["flawless", "noHints"],
      lockedCells: 2,
    },
    {
      from: 11,
      to: 15,
      chapter: "Academy",
      bandLabel: "Veiled Signals",
      maxHearts: 3,
      modifiers: ["foggedTargets"],
      missions: ["flawless", "noHints"],
      hiddenTargets: 1,
    },
    {
      from: 16,
      to: Infinity,
      chapter: "Academy",
      bandLabel: "Method Drill",
      maxHearts: 3,
      modifiers: ["oneWayTools", "comboHintPenalty"],
      missions: ["flawless", "rowRush"],
      lockMode: "select",
      toolUnlockCorrectMarks: 3,
    },
  ],
  medium: [
    {
      from: 1,
      to: 4,
      chapter: "Workshop",
      bandLabel: "Sharper Lines",
      maxHearts: 3,
      modifiers: ["lockedCells"],
      missions: ["flawless", "noHints"],
      lockedCells: 3,
    },
    {
      from: 5,
      to: 8,
      chapter: "Workshop",
      bandLabel: "Tight Margin",
      maxHearts: 2,
      modifiers: ["limitedErrors", "foggedTargets"],
      missions: ["flawless", "noHints"],
      hiddenTargets: 1,
    },
    {
      from: 9,
      to: Infinity,
      chapter: "Workshop",
      bandLabel: "Disciplined Flow",
      maxHearts: 2,
      modifiers: ["limitedErrors", "oneWayTools", "comboHintPenalty"],
      missions: ["flawless", "rowRush"],
      lockMode: "erase",
      toolUnlockCorrectMarks: 4,
    },
  ],
  hard: [
    {
      from: 1,
      to: 4,
      chapter: "Forge",
      bandLabel: "Pressure Build",
      maxHearts: 2,
      modifiers: ["limitedErrors", "lockedCells"],
      missions: ["flawless", "noHints"],
      lockedCells: 4,
    },
    {
      from: 5,
      to: 8,
      chapter: "Forge",
      bandLabel: "Blind Corners",
      maxHearts: 2,
      modifiers: ["limitedErrors", "foggedTargets", "comboHintPenalty"],
      missions: ["flawless", "rowRush"],
      hiddenTargets: 2,
    },
    {
      from: 9,
      to: Infinity,
      chapter: "Forge",
      bandLabel: "Tool Discipline",
      maxHearts: 2,
      modifiers: ["limitedErrors", "oneWayTools", "foggedTargets", "comboHintPenalty"],
      missions: ["flawless", "noHints", "rowRush"],
      lockMode: "select",
      toolUnlockCorrectMarks: 5,
      hiddenTargets: 2,
    },
  ],
  expert: [
    {
      from: 1,
      to: 5,
      chapter: "Sanctum",
      bandLabel: "Hidden Framework",
      maxHearts: 2,
      modifiers: ["limitedErrors", "lockedCells", "foggedTargets"],
      missions: ["flawless", "noHints"],
      lockedCells: 4,
      hiddenTargets: 2,
    },
    {
      from: 6,
      to: Infinity,
      chapter: "Sanctum",
      bandLabel: "Strict Order",
      maxHearts: 1,
      modifiers: ["limitedErrors", "oneWayTools", "foggedTargets", "comboHintPenalty"],
      missions: ["flawless", "noHints", "rowRush"],
      lockMode: "erase",
      toolUnlockCorrectMarks: 5,
      hiddenTargets: 2,
    },
  ],
  mythic: [
    {
      from: 1,
      to: Infinity,
      chapter: "Mythic",
      bandLabel: "Relentless Circuit",
      maxHearts: 1,
      modifiers: [
        "limitedErrors",
        "lockedCells",
        "foggedTargets",
        "oneWayTools",
        "comboHintPenalty",
      ],
      missions: ["flawless", "noHints", "rowRush"],
      lockMode: "select",
      toolUnlockCorrectMarks: 6,
      lockedCells: 5,
      hiddenTargets: 2,
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

  return {
    ...band,
    difficulty,
    level,
  };
}

export function getDifficultyUnlockRequirement(difficulty: DifficultyId) {
  return CHAPTER_UNLOCKS[difficulty] ?? 0;
}
