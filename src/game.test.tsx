import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RowFragment } from "./components/RowFragment";
import { TargetBadge } from "./components/TargetBadge";
import {
  applyRevealedMarks,
  countMatchedTargetsOnAxis,
  createEmptyMarks,
  createPuzzle,
  getDelayedCellProgress,
  getNextCommitment,
  getNextNoEchoLine,
  getPrimeFactors,
  getSpotlightProgress,
  getVisibleTarget,
  hasVisibleMatchedTarget,
  isCellBlockedByCommitment,
  isCellBlockedByNoEcho,
  isCellBlockedBySpotlight,
  isCellCloaked,
  isCellSealed,
  isHintGateUnlocked,
  isProgressHidden,
  isTargetCiphered,
  type Puzzle,
} from "./game";
import {
  MODIFIER_DETAILS,
  getDifficultyUnlockRequirement,
  getDifficultyUnlockSource,
  getLevelBlueprint,
  type ModifierId,
} from "./progression";

function forceModifierRolls(value: number) {
  return Object.fromEntries(
    Object.keys(MODIFIER_DETAILS).map((modifier) => [modifier, value]),
  ) as Partial<Record<ModifierId, number>>;
}

const FORCE_MODIFIERS_ON = forceModifierRolls(0);
const FORCE_MODIFIERS_OFF = forceModifierRolls(1);

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
    bandLabel: "Logic",
    ...overrides,
  };
}

describe("progression rollout", () => {
  it("unlocks medium and hard from easy, then gates expert and mythic by harder wins", () => {
    expect(getDifficultyUnlockSource("medium")).toBe("easy");
    expect(getDifficultyUnlockRequirement("medium")).toBe(1);
    expect(getDifficultyUnlockSource("hard")).toBe("easy");
    expect(getDifficultyUnlockRequirement("hard")).toBe(1);
    expect(getDifficultyUnlockSource("expert")).toBe("hard");
    expect(getDifficultyUnlockRequirement("expert")).toBe(10);
    expect(getDifficultyUnlockSource("mythic")).toBe("expert");
    expect(getDifficultyUnlockRequirement("mythic")).toBe(10);
  });

  it("rotates curated presets within a chapter band", () => {
    expect(getLevelBlueprint("medium", 1).modifiers).toEqual([
      "lockedCells",
      "sealedCells",
    ]);
    expect(getLevelBlueprint("medium", 2).modifiers).toEqual([
      "foggedTargets",
      "hintGate",
    ]);
    expect(getLevelBlueprint("medium", 3).modifiers).toEqual(["toolLock"]);
    expect(getLevelBlueprint("medium", 4).modifiers).toEqual(["spotlightLine"]);
    expect(getLevelBlueprint("medium", 5).modifiers).toEqual([
      "lockedCells",
      "foggedTargets",
      "hintGate",
    ]);
    expect(getLevelBlueprint("medium", 9).modifiers).toEqual([
      "spotlightLine",
      "foggedTargets",
    ]);
  });

  it("keeps easy levels free of the hardest pressure modifiers", () => {
    const blueprint = getLevelBlueprint("easy", 14);

    expect(blueprint.modifiers).not.toContain("deepFog");
    expect(blueprint.modifiers).not.toContain("crossBlind");
    expect(blueprint.modifiers).not.toContain("commitLine");
  });

  it("scales global modifiers from easy through mythic", () => {
    expect(getLevelBlueprint("easy", 3)).toEqual(
      expect.objectContaining({
        sealedCells: 1,
        sealedCellsUnlockAfterCorrectMarks: 1,
      }),
    );
    expect(getLevelBlueprint("medium", 1)).toEqual(
      expect.objectContaining({
        sealedCells: 2,
        sealedCellsUnlockAfterCorrectMarks: 2,
      }),
    );
    expect(getLevelBlueprint("hard", 3)).toEqual(
      expect.objectContaining({
        sealedCells: 3,
        sealedCellsUnlockAfterCorrectMarks: 3,
      }),
    );
    expect(getLevelBlueprint("expert", 3)).toEqual(
      expect.objectContaining({
        sealedCells: 3,
        sealedCellsUnlockAfterCorrectMarks: 4,
      }),
    );
    expect(getLevelBlueprint("mythic", 3)).toEqual(
      expect.objectContaining({
        sealedCells: 4,
        sealedCellsUnlockAfterCorrectMarks: 5,
      }),
    );
  });

  it("keeps expert and mythic-only modifiers out of lower difficulties", () => {
    const lowerDifficulties = ["easy", "medium", "hard"] as const;
    const expertOnly = ["quietProgress", "noEcho"] as const;
    const mythicOnly = ["cloakedCells", "factorCipher"] as const;

    for (const difficulty of lowerDifficulties) {
      for (let level = 1; level <= 14; level += 1) {
        const modifiers = getLevelBlueprint(difficulty, level).modifiers;

        for (const modifier of [...expertOnly, ...mythicOnly]) {
          expect(modifiers).not.toContain(modifier);
        }
      }
    }

    for (const difficulty of ["easy", "medium", "hard", "expert"] as const) {
      for (let level = 1; level <= 14; level += 1) {
        const modifiers = getLevelBlueprint(difficulty, level).modifiers;

        for (const modifier of mythicOnly) {
          expect(modifiers).not.toContain(modifier);
        }
      }
    }
  });

  it("does not stack mutually exclusive line constraints", () => {
    for (const difficulty of ["easy", "medium", "hard", "expert", "mythic"] as const) {
      for (let level = 1; level <= 16; level += 1) {
        const modifiers = getLevelBlueprint(difficulty, level).modifiers;
        const lineConstraints = ["commitLine", "spotlightLine", "noEcho"].filter(
          (modifier) => modifiers.includes(modifier as never),
        );

        expect(lineConstraints.length).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("puzzle generation", () => {
  it("creates uniquely solvable classic boards", () => {
    const puzzle = createPuzzle(1, "easy");

    expect(puzzle.modifiers).toHaveLength(0);
  });

  it("creates distributed locked cells with mixed revealed mark types", () => {
    const puzzle = createPuzzle(6, "easy", {
      modifierRolls: FORCE_MODIFIERS_ON,
    });
    const revealedMarks = puzzle.revealedMarks ?? [];

    expect(puzzle.modifiers.map((modifier) => modifier.id)).toContain("lockedCells");
    expect(revealedMarks.length).toBeGreaterThan(1);
    expect(new Set(revealedMarks.map((cell) => cell.mark))).toEqual(
      new Set(["selected", "erased"]),
    );
    expect(new Set(revealedMarks.map((cell) => cell.row)).size).toBeGreaterThan(1);
    expect(new Set(revealedMarks.map((cell) => cell.col)).size).toBeGreaterThan(1);
  });

  it("uses mark-threshold fog without preview data", () => {
    const puzzle = createPuzzle(11, "easy", {
      modifierRolls: FORCE_MODIFIERS_ON,
    });
    const hiddenTarget = puzzle.hiddenTargets?.find(
      (target) => target.reveal.kind === "marks",
    );

    expect(hiddenTarget).toBeTruthy();

    if (!hiddenTarget || hiddenTarget.reveal.kind !== "marks") {
      return;
    }

    const marks = applyRevealedMarks(
      createEmptyMarks(puzzle.size),
      puzzle.revealedMarks,
    );

    expect(getVisibleTarget(puzzle, marks, hiddenTarget.axis, hiddenTarget.index)).toBeNull();

    for (let step = 0; step < hiddenTarget.reveal.threshold; step += 1) {
      if (hiddenTarget.axis === "row") {
        marks[hiddenTarget.index][step] = "erased";
      } else {
        marks[step][hiddenTarget.index] = "erased";
      }
    }

    expect(getVisibleTarget(puzzle, marks, hiddenTarget.axis, hiddenTarget.index)).not.toBeNull();
  });

  it("keeps deep fog hidden until the exact line is matched or resolved", () => {
    const puzzle = createPuzzle(1, "hard", {
      limitedHeartRoll: 0.4,
      modifierRolls: FORCE_MODIFIERS_ON,
    });
    const hiddenTarget = puzzle.hiddenTargets?.find(
      (target) => target.reveal.kind === "matchedOrResolved",
    );

    expect(hiddenTarget).toBeTruthy();

    if (!hiddenTarget) {
      return;
    }

    const marks = applyRevealedMarks(
      createEmptyMarks(puzzle.size),
      puzzle.revealedMarks,
    );

    if (hiddenTarget.axis === "row") {
      marks[hiddenTarget.index][0] = "erased";
      expect(getVisibleTarget(puzzle, marks, "row", hiddenTarget.index)).toBeNull();

      for (let col = 0; col < puzzle.size; col += 1) {
        marks[hiddenTarget.index][col] = puzzle.solution[hiddenTarget.index][col]
          ? "selected"
          : "erased";
      }
    } else {
      marks[0][hiddenTarget.index] = "erased";
      expect(getVisibleTarget(puzzle, marks, "column", hiddenTarget.index)).toBeNull();

      for (let row = 0; row < puzzle.size; row += 1) {
        marks[row][hiddenTarget.index] = puzzle.solution[row][hiddenTarget.index]
          ? "selected"
          : "erased";
      }
    }

    expect(
      getVisibleTarget(puzzle, marks, hiddenTarget.axis, hiddenTarget.index),
    ).not.toBeNull();
  });

  it("generates cross blind boards that unlock after enough visible-axis matches", () => {
    const puzzle = createPuzzle(2, "expert", {
      limitedHeartRoll: 0.4,
      modifierRolls: FORCE_MODIFIERS_ON,
    });

    expect(puzzle.crossBlind).toBeTruthy();

    if (!puzzle.crossBlind) {
      return;
    }

    const marks = applyRevealedMarks(
      createEmptyMarks(puzzle.size),
      puzzle.revealedMarks,
    );
    const hiddenAxis = puzzle.crossBlind.hiddenAxis;
    const visibleAxis = hiddenAxis === "row" ? "column" : "row";
    const unlockedIndex = Array.from({ length: puzzle.size }, (_, index) => index).find(
      (index) =>
        !puzzle.hiddenTargets?.some(
          (target) => target.axis === hiddenAxis && target.index === index,
        ),
    );

    expect(unlockedIndex).toBeDefined();

    if (unlockedIndex === undefined) {
      return;
    }

    expect(getVisibleTarget(puzzle, marks, hiddenAxis, unlockedIndex)).toBeNull();

    for (
      let line = 0;
      line < puzzle.crossBlind.unlockAfterMatchedVisibleLines;
      line += 1
    ) {
      if (visibleAxis === "row") {
        for (let col = 0; col < puzzle.size; col += 1) {
          if (puzzle.solution[line][col]) {
            marks[line][col] = "selected";
          }
        }
      } else {
        for (let row = 0; row < puzzle.size; row += 1) {
          if (puzzle.solution[row][line]) {
            marks[row][line] = "selected";
          }
        }
      }
    }

    expect(countMatchedTargetsOnAxis(puzzle, marks, visibleAxis)).toBeGreaterThanOrEqual(
      puzzle.crossBlind.unlockAfterMatchedVisibleLines,
    );
    expect(getVisibleTarget(puzzle, marks, hiddenAxis, unlockedIndex)).not.toBeNull();
  });

  it("assigns commit-line metadata on the intended medium preset", () => {
    const puzzle = createPuzzle(7, "medium", {
      modifierRolls: FORCE_MODIFIERS_ON,
    });

    expect(puzzle.commitLine).toEqual(
      expect.objectContaining({
        checkpoint: 3,
      }),
    );
    expect(["row", "column"]).toContain(puzzle.commitLine?.axis);
  });

  it("always starts tool-lock boards in select mode", () => {
    const mediumPuzzle = createPuzzle(3, "medium", {
      modifierRolls: FORCE_MODIFIERS_ON,
    });
    const hardPuzzle = createPuzzle(3, "hard", {
      limitedHeartRoll: 0.4,
      modifierRolls: FORCE_MODIFIERS_ON,
    });

    expect(mediumPuzzle.toolLock?.initialMode).toBe("select");
    expect(hardPuzzle.toolLock?.initialMode).toBe("select");
  });

  it("treats limited hearts as an optional hard-mode modifier", () => {
    const noLimitPuzzle = createPuzzle(1, "expert", {
      limitedHeartRoll: 0.2,
      modifierRolls: FORCE_MODIFIERS_ON,
    });
    const twoHeartPuzzle = createPuzzle(1, "expert", {
      limitedHeartRoll: 0.6,
      modifierRolls: FORCE_MODIFIERS_ON,
    });
    const oneHeartPuzzle = createPuzzle(1, "expert", {
      limitedHeartRoll: 0.9,
      modifierRolls: FORCE_MODIFIERS_ON,
    });

    expect(noLimitPuzzle.maxHearts).toBe(3);
    expect(noLimitPuzzle.modifiers.map((modifier) => modifier.id)).not.toContain(
      "limitedErrors",
    );
    expect(twoHeartPuzzle.maxHearts).toBe(2);
    expect(twoHeartPuzzle.modifiers.map((modifier) => modifier.id)).toContain(
      "limitedErrors",
    );
    expect(oneHeartPuzzle.maxHearts).toBe(1);
    expect(oneHeartPuzzle.modifiers.map((modifier) => modifier.id)).toEqual([
      "limitedErrors",
    ]);
    expect(oneHeartPuzzle.hiddenTargets).toEqual([]);
    expect(oneHeartPuzzle.commitLine).toBeUndefined();
    expect(oneHeartPuzzle.toolLock).toBeUndefined();
    expect(oneHeartPuzzle.crossBlind).toBeUndefined();
    expect(oneHeartPuzzle.sealedCells).toBeUndefined();
    expect(oneHeartPuzzle.spotlightLine).toBeUndefined();
    expect(oneHeartPuzzle.hintGate).toBeUndefined();
    expect(oneHeartPuzzle.quietProgressTargets).toEqual([]);
    expect(oneHeartPuzzle.noEcho).toBeUndefined();
    expect(oneHeartPuzzle.cloakedCells).toBeUndefined();
    expect(oneHeartPuzzle.factorCipher).toBeUndefined();
  });

  it("places quiet-progress targets on visible badges before falling back", () => {
    const puzzle = createPuzzle(1, "expert", {
      limitedHeartRoll: 0.4,
      modifierRolls: FORCE_MODIFIERS_ON,
    });

    expect(puzzle.modifiers.map((modifier) => modifier.id)).toContain("quietProgress");
    expect(puzzle.quietProgressTargets).toHaveLength(2);

    for (const quietTarget of puzzle.quietProgressTargets ?? []) {
      expect(
        puzzle.hiddenTargets?.some(
          (hiddenTarget) =>
            hiddenTarget.axis === quietTarget.axis &&
            hiddenTarget.index === quietTarget.index,
        ),
      ).toBe(false);
    }
  });

  it("can roll all candidate modifiers off for a classic-feeling level", () => {
    const puzzle = createPuzzle(1, "medium", {
      modifierRolls: FORCE_MODIFIERS_OFF,
    });

    expect(puzzle.modifiers).toEqual([]);
    expect(puzzle.revealedMarks).toEqual([]);
    expect(puzzle.sealedCells).toBeUndefined();
  });

  it("clears metadata when a candidate modifier misses its chance", () => {
    const puzzle = createPuzzle(4, "medium", {
      modifierRolls: FORCE_MODIFIERS_OFF,
    });

    expect(puzzle.modifiers).toEqual([]);
    expect(puzzle.spotlightLine).toBeUndefined();
  });

  it("keeps factor cipher rare and omits its metadata when it misses", () => {
    const missedPuzzle = createPuzzle(1, "mythic", {
      limitedHeartRoll: 0.4,
      modifierRolls: {
        ...FORCE_MODIFIERS_ON,
        factorCipher: 1,
      },
    });
    const activePuzzle = createPuzzle(1, "mythic", {
      limitedHeartRoll: 0.4,
      modifierRolls: {
        ...FORCE_MODIFIERS_OFF,
        factorCipher: 0,
      },
    });

    expect(missedPuzzle.modifiers.map((modifier) => modifier.id)).not.toContain(
      "factorCipher",
    );
    expect(missedPuzzle.factorCipher).toBeUndefined();
    expect(activePuzzle.modifiers.map((modifier) => modifier.id)).toEqual([
      "limitedErrors",
      "factorCipher",
    ]);
    expect(activePuzzle.factorCipher).toBeTruthy();
  });
});

describe("logic helpers", () => {
  it("treats tool lock progress as visible-target matching only", () => {
    const puzzle = createTestPuzzle();
    const marks = createEmptyMarks(puzzle.size);

    expect(hasVisibleMatchedTarget(puzzle, marks)).toBe(false);

    marks[0][0] = "selected";

    expect(hasVisibleMatchedTarget(puzzle, marks)).toBe(true);
  });

  it("keeps fogged targets hidden after cross-blind lifts until their own reveal rule passes", () => {
    const puzzle = createTestPuzzle({
      crossBlind: {
        hiddenAxis: "row",
        unlockAfterMatchedVisibleLines: 1,
      },
      hiddenTargets: [
        {
          axis: "row",
          index: 0,
          reveal: {
            kind: "marks",
            threshold: 2,
          },
        },
      ],
    });
    const marks = createEmptyMarks(puzzle.size);

    expect(getVisibleTarget(puzzle, marks, "row", 0)).toBeNull();

    marks[0][0] = "selected";

    expect(getVisibleTarget(puzzle, marks, "row", 0)).toBeNull();

    marks[0][1] = "selected";

    expect(getVisibleTarget(puzzle, marks, "row", 0)).toBe(2);
  });

  it("activates commitment on the first valid mark and blocks off-line cells", () => {
    const puzzle = createTestPuzzle({
      solution: [
        [true, true],
        [false, true],
      ],
      rowTargets: [6, 7],
      colTargets: [2, 21],
      commitLine: {
        axis: "row",
        checkpoint: 2,
      },
    });
    const marks = createEmptyMarks(puzzle.size);

    marks[0][0] = "selected";

    const commitment = getNextCommitment(puzzle, marks, null, 0, 0);

    expect(commitment).toEqual({ axis: "row", index: 0 });
    expect(isCellBlockedByCommitment(commitment, 1, 0)).toBe(true);
    expect(isCellBlockedByCommitment(commitment, 0, 1)).toBe(false);
  });

  it("releases commitment when the checkpoint is reached", () => {
    const puzzle = createTestPuzzle({
      solution: [
        [true, true],
        [false, true],
      ],
      rowTargets: [6, 7],
      colTargets: [2, 21],
      commitLine: {
        axis: "row",
        checkpoint: 2,
      },
    });
    const marks = createEmptyMarks(puzzle.size);

    marks[0][0] = "selected";
    const commitment = getNextCommitment(puzzle, marks, null, 0, 0);

    expect(commitment).toEqual({ axis: "row", index: 0 });

    marks[0][1] = "selected";

    expect(getNextCommitment(puzzle, marks, commitment)).toBeNull();
  });

  it("releases commitment when a visible target is matched", () => {
    const puzzle = createTestPuzzle({
      commitLine: {
        axis: "row",
        checkpoint: 5,
      },
    });
    const marks = createEmptyMarks(puzzle.size);

    marks[0][0] = "selected";

    expect(getNextCommitment(puzzle, marks, null, 0, 0)).toBeNull();
  });

  it("releases commitment on a fully resolved line even under deep fog", () => {
    const puzzle = createTestPuzzle({
      solution: [
        [true, true],
        [false, true],
      ],
      rowTargets: [6, 7],
      colTargets: [2, 21],
      commitLine: {
        axis: "row",
        checkpoint: 5,
      },
      hiddenTargets: [
        {
          axis: "row",
          index: 0,
          reveal: {
            kind: "matchedOrResolved",
          },
        },
      ],
    });
    const marks = createEmptyMarks(puzzle.size);

    marks[0][0] = "selected";
    let commitment = getNextCommitment(puzzle, marks, null, 0, 0);

    expect(commitment).toEqual({ axis: "row", index: 0 });

    marks[0][1] = "selected";
    commitment = getNextCommitment(puzzle, marks, commitment);

    expect(commitment).toBeNull();
  });

  it("locks sealed cells until global correct-mark progress is reached", () => {
    const puzzle = createTestPuzzle({
      sealedCells: {
        cells: [{ row: 1, col: 1 }],
        unlockAfterCorrectMarks: 1,
      },
    });
    const marks = createEmptyMarks(puzzle.size);

    expect(isCellSealed(puzzle, marks, 1, 1)).toBe(true);
    expect(getDelayedCellProgress(puzzle, marks, puzzle.sealedCells)).toEqual({
      current: 0,
      required: 1,
      unlocked: false,
    });

    marks[0][0] = "selected";

    expect(isCellSealed(puzzle, marks, 1, 1)).toBe(false);
  });

  it("does not count prefilled locked cells toward global unlock gates", () => {
    const puzzle = createTestPuzzle({
      revealedMarks: [{ row: 0, col: 0, mark: "selected" }],
      sealedCells: {
        cells: [{ row: 1, col: 1 }],
        unlockAfterCorrectMarks: 1,
      },
    });
    const marks = applyRevealedMarks(createEmptyMarks(puzzle.size), puzzle.revealedMarks);

    expect(isCellSealed(puzzle, marks, 1, 1)).toBe(true);

    marks[1][0] = "erased";

    expect(isCellSealed(puzzle, marks, 1, 1)).toBe(false);
  });

  it("blocks off-spotlight cells until the required line progress is reached", () => {
    const puzzle = createTestPuzzle({
      spotlightLine: {
        axis: "row",
        index: 0,
        requiredCorrectMarks: 1,
      },
    });
    const marks = createEmptyMarks(puzzle.size);

    expect(isCellBlockedBySpotlight(puzzle, marks, 1, 0)).toBe(true);
    expect(isCellBlockedBySpotlight(puzzle, marks, 0, 1)).toBe(false);
    expect(getSpotlightProgress(puzzle, marks)?.complete).toBe(false);

    marks[0][0] = "selected";

    expect(getSpotlightProgress(puzzle, marks)?.complete).toBe(true);
    expect(isCellBlockedBySpotlight(puzzle, marks, 1, 0)).toBe(false);
  });

  it("gates hints until early correct marks are made", () => {
    const puzzle = createTestPuzzle({
      hintGate: {
        unlockAfterCorrectMarks: 1,
      },
    });
    const marks = createEmptyMarks(puzzle.size);

    expect(isHintGateUnlocked(puzzle, marks)).toBe(false);

    marks[0][0] = "selected";

    expect(isHintGateUnlocked(puzzle, marks)).toBe(true);
  });

  it("moves no-echo blocking to the most recent correct line", () => {
    const puzzle = createTestPuzzle({
      noEcho: {
        axis: "row",
      },
      solution: [
        [true, true],
        [false, true],
      ],
      rowTargets: [6, 7],
      colTargets: [2, 21],
    });
    const marks = createEmptyMarks(puzzle.size);

    marks[0][0] = "selected";
    let noEchoLine = getNextNoEchoLine(puzzle, marks, null, 0, 0);

    expect(noEchoLine).toEqual({ axis: "row", index: 0 });
    expect(isCellBlockedByNoEcho(noEchoLine, 0, 1)).toBe(true);
    expect(isCellBlockedByNoEcho(noEchoLine, 1, 0)).toBe(false);

    marks[1][1] = "selected";
    noEchoLine = getNextNoEchoLine(puzzle, marks, noEchoLine, 1, 1);

    expect(noEchoLine).toBeNull();
  });

  it("keeps cloaked cells hidden and disabled until global progress unlocks them", () => {
    const puzzle = createTestPuzzle({
      cloakedCells: {
        cells: [{ row: 1, col: 0 }],
        unlockAfterCorrectMarks: 1,
      },
    });
    const marks = createEmptyMarks(puzzle.size);

    expect(isCellCloaked(puzzle, marks, 1, 0)).toBe(true);

    marks[0][0] = "selected";

    expect(isCellCloaked(puzzle, marks, 1, 0)).toBe(false);
  });

  it("hides quiet progress until a line is matched or resolved", () => {
    const puzzle = createTestPuzzle({
      modifiers: [
        {
          id: "quietProgress",
          title: "Quiet Progress",
          short: "Some progress ticks stay hidden.",
          description:
            "Target badges hide their small running product until that line is matched or resolved.",
        },
      ],
      quietProgressTargets: [{ axis: "row", index: 0 }],
      solution: [
        [true, true],
        [false, true],
      ],
      rowTargets: [6, 7],
      colTargets: [2, 21],
    });
    const marks = createEmptyMarks(puzzle.size);

    marks[0][0] = "selected";

    expect(isProgressHidden(puzzle, marks, "row", 0)).toBe(true);
    expect(isProgressHidden(puzzle, marks, "column", 1)).toBe(true);

    marks[0][1] = "selected";

    expect(isProgressHidden(puzzle, marks, "row", 0)).toBe(false);
  });

  it("renders factor ciphers until opposite-axis targets are matched", () => {
    const puzzle = createTestPuzzle({
      factorCipher: {
        axis: "row",
        unlockAfterMatchedOppositeTargets: 1,
      },
    });
    const marks = createEmptyMarks(puzzle.size);

    expect(isTargetCiphered(puzzle, marks, "row")).toBe(true);
    expect(getPrimeFactors(12)).toEqual([2, 2, 3]);

    marks[0][0] = "selected";

    expect(isTargetCiphered(puzzle, marks, "row")).toBe(false);
  });
});

describe("component rendering", () => {
  it("renders hidden blind targets as plain question marks with blind labeling", () => {
    const html = renderToStaticMarkup(
      <TargetBadge target={null} concealment="blind" progress={1} resolved={false} />,
    );

    expect(html).toContain("?");
    expect(html).toContain("Blind");
    expect(html).not.toContain("picks");
  });

  it("hides the running progress number for quiet target badges", () => {
    const html = renderToStaticMarkup(
      <TargetBadge
        target={12}
        progress={6}
        progressHidden
        resolved={false}
      />,
    );

    expect(html).toContain("12");
    expect(html).not.toContain(">6<");
    expect(html).not.toContain("...");
  });

  it("dims and disables row cells outside an active commitment", () => {
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
    const html = renderToStaticMarkup(
      <RowFragment
        row={1}
        puzzle={puzzle}
        marks={createEmptyMarks(puzzle.size)}
        focusKey={null}
        activeCommitment={{ axis: "row", index: 0 }}
        noEchoLine={null}
        onPress={() => undefined}
      />,
    );

    expect(html.match(/disabled=""/g)?.length ?? 0).toBe(puzzle.size);
  });

  it("updates tool-lock teaching copy to reference visible targets", () => {
    expect(MODIFIER_DETAILS.toolLock.description).toContain("select mode");
    expect(MODIFIER_DETAILS.toolLock.description).toContain("visible target");
  });
});
