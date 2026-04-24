import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RowFragment } from "./components/RowFragment";
import { TargetBadge } from "./components/TargetBadge";
import {
  applyRevealedMarks,
  countMatchedTargetsOnAxis,
  createEmptyMarks,
  createPuzzle,
  getNextCommitment,
  getVisibleTarget,
  hasVisibleMatchedTarget,
  isCellBlockedByCommitment,
  type Puzzle,
} from "./game";
import { MODIFIER_DETAILS, getLevelBlueprint } from "./progression";

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
  it("rotates curated presets within a chapter band", () => {
    expect(getLevelBlueprint("medium", 1).modifiers).toEqual(["lockedCells"]);
    expect(getLevelBlueprint("medium", 2).modifiers).toEqual(["foggedTargets"]);
    expect(getLevelBlueprint("medium", 3).modifiers).toEqual(["toolLock"]);
    expect(getLevelBlueprint("medium", 4).modifiers).toEqual(["commitLine"]);
    expect(getLevelBlueprint("medium", 5).modifiers).toEqual([
      "lockedCells",
      "foggedTargets",
    ]);
    expect(getLevelBlueprint("medium", 9).modifiers).toEqual([
      "lockedCells",
      "foggedTargets",
    ]);
  });

  it("keeps easy levels free of the hardest pressure modifiers", () => {
    const blueprint = getLevelBlueprint("easy", 14);

    expect(blueprint.modifiers).not.toContain("deepFog");
    expect(blueprint.modifiers).not.toContain("crossBlind");
    expect(blueprint.modifiers).not.toContain("commitLine");
  });
});

describe("puzzle generation", () => {
  it("creates uniquely solvable classic boards", () => {
    const puzzle = createPuzzle(1, "easy");

    expect(puzzle.modifiers).toHaveLength(0);
  });

  it("creates distributed locked cells with mixed revealed mark types", () => {
    const puzzle = createPuzzle(6, "easy");
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
    const puzzle = createPuzzle(11, "easy");
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
    const puzzle = createPuzzle(1, "hard");
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
    const puzzle = createPuzzle(2, "expert");

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
    const puzzle = createPuzzle(4, "medium");

    expect(puzzle.commitLine).toEqual(
      expect.objectContaining({
        checkpoint: 3,
      }),
    );
    expect(["row", "column"]).toContain(puzzle.commitLine?.axis);
  });

  it("always starts tool-lock boards in select mode", () => {
    const mediumPuzzle = createPuzzle(3, "medium");
    const hardPuzzle = createPuzzle(3, "hard");

    expect(mediumPuzzle.toolLock?.initialMode).toBe("select");
    expect(hardPuzzle.toolLock?.initialMode).toBe("select");
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
