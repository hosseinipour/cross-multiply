import { describe, expect, it } from "vitest";
import { buildSessionFromPuzzle, type SessionState } from "./appState";
import { describeCell, explainCellBlock, getCellBlock } from "./cellState";
import type { Puzzle } from "./game";
import { getBoardStatuses, getMissionState } from "./hud/boardStatus";
import { getBoardFrame, getFitDistance, TILE_STEP } from "./scene/layout";

function createPuzzle(overrides: Partial<Puzzle> = {}): Puzzle {
  return {
    id: "presentation-test",
    level: 1,
    difficulty: "easy",
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
    modifiers: [],
    missions: [
      { id: "flawless", title: "Flawless", description: "" },
      { id: "noHints", title: "No Hints", description: "" },
      { id: "rowRush", title: "Row Rush", description: "" },
    ],
    maxHearts: 3,
    chapter: "Test",
    bandLabel: "Logic",
    ...overrides,
  };
}

function createSession(overrides: Partial<SessionState> = {}, puzzle = createPuzzle()) {
  return { ...buildSessionFromPuzzle(puzzle), ...overrides };
}

describe("cell state", () => {
  it("blocks every cell outside an active commitment", () => {
    const session = createSession({ activeCommitment: { axis: "row", index: 0 } });

    for (let col = 0; col < 3; col += 1) {
      expect(getCellBlock(session, 0, col)).toBeNull();
      expect(getCellBlock(session, 1, col)).toBe("hold");
    }
    expect(describeCell(session, 1, 0)).toContain("stay on your committed line");
    expect(explainCellBlock(session, "hold")).toContain("row 1");
  });

  it("hides cloaked values and explains how to open them", () => {
    const session = createSession(
      {},
      createPuzzle({
        cloakedCells: { cells: [{ row: 2, col: 2 }], unlockAfterCorrectMarks: 2 },
      }),
    );

    expect(getCellBlock(session, 2, 2)).toBe("cloak");
    expect(describeCell(session, 2, 2)).toContain("hidden value");
    expect(describeCell(session, 2, 2)).not.toContain("23");
    expect(explainCellBlock(session, "cloak")).toContain("2 correct marks (0 so far)");
  });
});

describe("board statuses", () => {
  it("ranks the most urgent constraints first", () => {
    const session = createSession({
      toolLocked: true,
      activeCommitment: { axis: "column", index: 2 },
      noEchoLine: { axis: "row", index: 0 },
    });

    expect(getBoardStatuses(session).map((status) => status.key)).toEqual([
      "no-echo",
      "commitment",
      "tool-lock",
    ]);
  });

  it("tracks which missions can still be earned", () => {
    const fresh = createSession();
    expect(getMissionState(fresh, "flawless")).toBe("onTrack");

    const bruised = createSession({ mistakes: 1, hearts: 2, eraseUsedBeforeRowsResolved: true });
    expect(getMissionState(bruised, "flawless")).toBe("failed");
    expect(getMissionState(bruised, "noHints")).toBe("onTrack");
    expect(getMissionState(bruised, "rowRush")).toBe("failed");
  });
});

describe("board layout", () => {
  it("centres the grid and its pillars on the origin", () => {
    const frame = getBoardFrame(5);

    expect(frame.pillarX + frame.colX(4)).toBeCloseTo(0, 5);
    expect(frame.colX(1) - frame.colX(0)).toBeCloseTo(TILE_STEP, 5);
    expect(frame.rowZ(2)).toBe(frame.colX(2));
  });

  it("pulls the camera back when the stage gets narrower", () => {
    const base = {
      boardWidth: 8,
      boardDepth: 8,
      boardHeight: 1.5,
      elevation: Math.PI / 3,
      fov: 36,
      canvasHeight: 800,
    };
    const wide = getFitDistance({ ...base, stage: { x: 0, y: 0, width: 1200, height: 800 } });
    const narrow = getFitDistance({ ...base, stage: { x: 0, y: 0, width: 380, height: 800 } });

    expect(narrow).toBeGreaterThan(wide);
  });
});
