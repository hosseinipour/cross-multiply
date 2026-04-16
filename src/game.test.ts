import { describe, expect, it } from "vitest";
import {
  areAllRowTargetsMet,
  applyRevealedMarks,
  countSolutions,
  createEmptyMarks,
  createPuzzle,
  getCorrectMarkCount,
  getVisibleTarget,
} from "./game";
import { getLevelBlueprint } from "./progression";

describe("progression rollout", () => {
  it("keeps early easy levels classic", () => {
    const blueprint = getLevelBlueprint("easy", 3);

    expect(blueprint.modifiers).toEqual([]);
    expect(blueprint.maxHearts).toBe(3);
  });

  it("introduces modifiers in later level bands", () => {
    expect(getLevelBlueprint("easy", 6).modifiers).toContain("lockedCells");
    expect(getLevelBlueprint("easy", 11).modifiers).toContain("foggedTargets");
    expect(getLevelBlueprint("easy", 16).modifiers).toEqual(
      expect.arrayContaining(["oneWayTools", "comboHintPenalty"]),
    );
    expect(getLevelBlueprint("medium", 5).modifiers).toEqual(
      expect.arrayContaining(["limitedErrors", "foggedTargets"]),
    );
  });
});

describe("puzzle generation", () => {
  it("creates uniquely solvable classic boards", () => {
    const puzzle = createPuzzle(1, "easy");
    const solutions = countSolutions(
      puzzle.board,
      puzzle.rowTargets,
      puzzle.colTargets,
      2,
    );

    expect(solutions).toBe(1);
    expect(puzzle.modifiers).toHaveLength(0);
  });

  it("creates locked-cell boards with prefills", () => {
    const puzzle = createPuzzle(6, "easy");

    expect(puzzle.modifiers.map((modifier) => modifier.id)).toContain(
      "lockedCells",
    );
    expect(puzzle.revealedMarks?.length ?? 0).toBeGreaterThan(0);
  });

  it("tracks correct marks for one-way tool unlocks", () => {
    const puzzle = createPuzzle(16, "easy");
    const marks = applyRevealedMarks(
      createEmptyMarks(puzzle.size),
      puzzle.revealedMarks,
    );

    expect(puzzle.toolUnlockCorrectMarks).toBe(3);

    let applied = 0;
    for (let row = 0; row < puzzle.size; row += 1) {
      for (let col = 0; col < puzzle.size; col += 1) {
        if (marks[row][col] !== "hidden") {
          continue;
        }

        marks[row][col] = puzzle.solution[row][col] ? "selected" : "erased";
        applied += 1;

        if (applied === 2) {
          expect(getCorrectMarkCount(puzzle, marks)).toBe(2);
        }

        if (applied === 3) {
          expect(getCorrectMarkCount(puzzle, marks)).toBe(3);
          return;
        }
      }
    }
  });

  it("hides fogged targets until enough marks are committed", () => {
    const puzzle = createPuzzle(11, "easy");
    const hiddenTarget = puzzle.hiddenTargets?.[0];

    expect(hiddenTarget).toBeTruthy();

    if (!hiddenTarget) {
      return;
    }

    const marks = applyRevealedMarks(
      createEmptyMarks(puzzle.size),
      puzzle.revealedMarks,
    );

    expect(
      getVisibleTarget(puzzle, marks, hiddenTarget.axis, hiddenTarget.index),
    ).toBeNull();

    for (let step = 0; step < hiddenTarget.revealAfterMarks; step += 1) {
      if (hiddenTarget.axis === "row") {
        marks[hiddenTarget.index][step] = "erased";
      } else {
        marks[step][hiddenTarget.index] = "erased";
      }
    }

    expect(
      getVisibleTarget(puzzle, marks, hiddenTarget.axis, hiddenTarget.index),
    ).not.toBeNull();
  });

  it("treats row rush as complete when row targets are met before erase mode", () => {
    const puzzle = createPuzzle(16, "easy");
    const marks = applyRevealedMarks(
      createEmptyMarks(puzzle.size),
      puzzle.revealedMarks,
    );

    for (let row = 0; row < puzzle.size; row += 1) {
      for (let col = 0; col < puzzle.size; col += 1) {
        if (puzzle.solution[row][col]) {
          marks[row][col] = "selected";
        }
      }
    }

    expect(areAllRowTargetsMet(puzzle, marks)).toBe(true);
  });
});
