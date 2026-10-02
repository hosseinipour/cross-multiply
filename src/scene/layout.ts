/** World-space measurements for the board. One unit is roughly one tile. */
export const TILE_SIZE = 1;
export const TILE_GAP = 0.14;
export const TILE_STEP = TILE_SIZE + TILE_GAP;
export const TILE_HEIGHT = 0.42;
/** Extra room between the grid and the target pillars. */
export const PILLAR_GAP = 0.22;

export type BoardFrame = {
  size: number;
  /** World-space x of a column (also used for column pillars). */
  colX: (col: number) => number;
  /** World-space z of a row (also used for row pillars). */
  rowZ: (row: number) => number;
  /** x of the row-target pillars, left of column 0. */
  pillarX: number;
  /** z of the column-target pillars, behind row 0. */
  pillarZ: number;
  /** Footprint of grid plus pillars, centred on the origin. */
  width: number;
  depth: number;
};

/**
 * Centres the grid *and* its pillars on the origin so the camera can frame
 * the whole playable object without offsets.
 */
export function getBoardFrame(size: number): BoardFrame {
  const span = (size + 1) * TILE_STEP + PILLAR_GAP;
  const origin = -span / 2 + TILE_STEP / 2;
  const gridStart = origin + TILE_STEP + PILLAR_GAP;

  return {
    size,
    colX: (col) => gridStart + col * TILE_STEP,
    rowZ: (row) => gridStart + row * TILE_STEP,
    pillarX: origin,
    pillarZ: origin,
    width: span,
    depth: span,
  };
}

export type StageRect = { x: number; y: number; width: number; height: number };

/**
 * Distance a camera with the given vertical FOV needs to fit a tilted board
 * inside a sub-rectangle of the canvas. Perspective growth at the near edge
 * is covered by the margin.
 */
export function getFitDistance({
  boardWidth,
  boardDepth,
  boardHeight,
  elevation,
  fov,
  canvasHeight,
  stage,
  margin = 1.1,
}: {
  boardWidth: number;
  boardDepth: number;
  boardHeight: number;
  elevation: number;
  fov: number;
  canvasHeight: number;
  stage: StageRect;
  margin?: number;
}) {
  const halfTan = Math.tan((fov * Math.PI) / 360);
  const projectedDepth =
    boardDepth * Math.sin(elevation) + boardHeight * Math.cos(elevation);
  const pixelsPerUnitAtOne = canvasHeight / 2 / halfTan;
  const widthFit = (boardWidth * pixelsPerUnitAtOne) / Math.max(1, stage.width);
  const depthFit = (projectedDepth * pixelsPerUnitAtOne) / Math.max(1, stage.height);

  return Math.max(widthFit, depthFit) * margin;
}
