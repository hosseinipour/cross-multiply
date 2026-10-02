import { useEffect, useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { useFrame } from "@react-three/fiber";
import { easing } from "maath";
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  ShaderMaterial,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { SessionState } from "../appState";
import { getCellBlock } from "../cellState";
import {
  getColProgress,
  getPrimeFactors,
  getRowProgress,
  getSpotlightProgress,
  getTargetConcealment,
  getVisibleTarget,
  isCellBlockedBySpotlight,
  isCellLocked,
  isColResolved,
  isProgressHidden,
  isRowResolved,
  isTargetCiphered,
  type TargetAxis,
  type ToolMode,
} from "../game";
import { fx } from "./fx";
import { onFx } from "./fxBus";
import { getBoardFrame, TILE_HEIGHT, TILE_STEP, type BoardFrame } from "./layout";
import { PILLAR_HEIGHT, TargetPillar } from "./TargetPillar";
import { Tile } from "./Tile";
import type { WorldTheme } from "./worlds";

export type CellRef = { row: number; col: number };

const curtainVertex = /* glsl */ `
  varying float vHeight;
  varying float vSide;
  void main() {
    vHeight = position.y + 0.5;
    vSide = abs(normal.y) < 0.5 ? 1.0 : 0.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const curtainFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying float vHeight;
  varying float vSide;
  void main() {
    if (vSide < 0.5) discard;
    float band = 0.75 + 0.25 * sin(vHeight * 14.0 - uTime * 3.0);
    float fade = pow(1.0 - vHeight, 2.2);
    gl_FragColor = vec4(uColor * 1.5, fade * uOpacity * band);
  }
`;

const unitBox = new BoxGeometry(1, 1, 1);

function LineCurtain({
  axis,
  index,
  frame,
  color,
  height,
  opacity,
}: {
  axis: TargetAxis;
  index: number;
  frame: BoardFrame;
  color: string;
  height: number;
  opacity: number;
}) {
  const mesh = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: curtainVertex,
        fragmentShader: curtainFragment,
        uniforms: {
          uColor: { value: new Color(color) },
          uOpacity: { value: 0 },
          uTime: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
      }),
    // The colour is synced below; the material lives as long as the curtain.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => () => material.dispose(), [material]);

  const length = frame.size * TILE_STEP;
  const centre =
    (axis === "row" ? frame.colX(0) + frame.colX(frame.size - 1) : frame.rowZ(0) + frame.rowZ(frame.size - 1)) / 2;
  const position: [number, number, number] =
    axis === "row"
      ? [centre, height / 2, frame.rowZ(index)]
      : [frame.colX(index), height / 2, centre];
  const scale: [number, number, number] =
    axis === "row" ? [length, height, TILE_STEP * 0.98] : [TILE_STEP * 0.98, height, length];

  useFrame((state, delta) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    (material.uniforms.uColor.value as Color).set(color);
    material.uniforms.uOpacity.value +=
      (opacity - material.uniforms.uOpacity.value) * Math.min(1, delta * 4);
  });

  return (
    <mesh
      ref={mesh}
      geometry={unitBox}
      material={material}
      position={position}
      scale={scale}
      raycast={() => null}
    />
  );
}

function KeyboardCursor({
  cell,
  frame,
  color,
}: {
  cell: CellRef | null;
  frame: BoardFrame;
  color: string;
}) {
  const group = useRef<Group>(null);
  const material = useMemo(
    () => new MeshStandardMaterial({ emissiveIntensity: 2, toneMapped: false }),
    [],
  );

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) {
      return;
    }

    g.visible = cell !== null;
    if (!cell) {
      return;
    }

    easing.damp3(
      g.position,
      [frame.colX(cell.col), TILE_HEIGHT + 0.32 + Math.sin(state.clock.elapsedTime * 4) * 0.04, frame.rowZ(cell.row)],
      0.06,
      delta,
    );
    material.color.set(color);
    material.emissive.set(color);
  });

  const corners = [
    [-1, -1],
    [1, -1],
    [-1, 1],
    [1, 1],
  ] as const;

  return (
    <group ref={group} visible={false}>
      {corners.map(([sx, sz]) => (
        <group key={`${sx}${sz}`} position={[sx * 0.52, 0, sz * 0.52]}>
          <mesh material={material} position={[-sx * 0.1, 0, 0]} raycast={() => null}>
            <boxGeometry args={[0.24, 0.06, 0.06]} />
          </mesh>
          <mesh material={material} position={[0, 0, -sz * 0.1]} raycast={() => null}>
            <boxGeometry args={[0.06, 0.06, 0.24]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

const emblemBar = new RoundedBoxGeometry(0.95, 0.2, 0.22, 2, 0.08);

function ComboEmblem({
  frame,
  theme,
  streak,
  reducedMotion,
}: {
  frame: BoardFrame;
  theme: WorldTheme;
  streak: number;
  reducedMotion: boolean;
}) {
  const group = useRef<Group>(null);
  const bar = useRef<Mesh>(null);
  const pulse = useRef(0);
  const lastStreak = useRef(streak);
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: theme.crystal,
        emissive: theme.crystal,
        roughness: 0.2,
        metalness: 0.3,
        emissiveIntensity: 0.6,
      }),
    // Seeded from the world at mount; the frame loop keeps it in sync.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const g = group.current;
    if (!g) {
      return;
    }

    if (streak > lastStreak.current) {
      pulse.current = 1;
    }
    lastStreak.current = streak;
    pulse.current = Math.max(0, pulse.current - delta * 2.5);

    const heat = Math.min(1, streak / 10);
    const spin = reducedMotion ? 0.2 : 0.6 + heat * 3.5;
    g.rotation.y += delta * spin;
    const scale = 1 + pulse.current * 0.35 + heat * 0.15;
    easing.damp3(g.scale, [scale, scale, scale], 0.08, delta);
    g.position.y = 0.75 + Math.sin(state.clock.elapsedTime * 1.6) * 0.06 + heat * 0.25;
    // Both bars share this material, reached through the scene graph.
    const shared = bar.current?.material as MeshStandardMaterial | undefined;
    if (shared) {
      shared.color.set(theme.crystal);
      shared.emissive.set(theme.crystal);
      shared.emissiveIntensity = 0.35 + heat * 1.2 + pulse.current;
    }
  });

  return (
    <group position={[frame.pillarX, 0.75, frame.pillarZ]}>
      <group ref={group}>
        <mesh ref={bar} geometry={emblemBar} material={material} rotation={[0, Math.PI / 4, 0]} castShadow />
        <mesh geometry={emblemBar} material={material} rotation={[0, -Math.PI / 4, 0]} castShadow />
      </group>
    </group>
  );
}

function BoardBase({ frame, theme }: { frame: BoardFrame; theme: WorldTheme }) {
  const width = frame.width + 0.7;
  const depth = frame.depth + 0.7;
  const geometries = useMemo(
    () => ({
      top: new RoundedBoxGeometry(width, 0.24, depth, 3, 0.1),
      side: new RoundedBoxGeometry(width - 0.2, 0.7, depth - 0.2, 2, 0.12),
      island: new ConeGeometry(Math.max(width, depth) * 0.6, Math.max(width, depth) * 0.95, 7, 3),
      shard: new ConeGeometry(0.6, 2.2, 5, 1),
    }),
    [depth, width],
  );
  useEffect(
    () => () => {
      Object.values(geometries).forEach((geometry) => geometry.dispose());
    },
    [geometries],
  );

  const materials = useMemo(
    () => ({
      top: new MeshStandardMaterial({ color: theme.slab, roughness: 0.85 }),
      side: new MeshStandardMaterial({ color: theme.slabSide, roughness: 0.95, flatShading: true }),
      rock: new MeshStandardMaterial({ color: theme.rock, roughness: 1, flatShading: true }),
    }),
    // Seeded from the world at mount, then damped toward it each frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const targetColors = useMemo(
    () => ({ top: new Color(), side: new Color(), rock: new Color() }),
    [],
  );

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    targetColors.top.set(theme.slab);
    targetColors.side.set(theme.slabSide);
    targetColors.rock.set(theme.rock);
    easing.dampC(materials.top.color, targetColors.top, 0.5, delta);
    easing.dampC(materials.side.color, targetColors.side, 0.5, delta);
    easing.dampC(materials.rock.color, targetColors.rock, 0.5, delta);
  });

  const islandHeight = Math.max(width, depth) * 0.95;

  return (
    <group>
      <mesh geometry={geometries.top} material={materials.top} position={[0, -0.12, 0]} receiveShadow />
      <mesh geometry={geometries.side} material={materials.side} position={[0, -0.55, 0]} receiveShadow />
      <mesh
        geometry={geometries.island}
        material={materials.rock}
        position={[0, -0.85 - islandHeight / 2, 0]}
        rotation={[Math.PI, 0.3, 0]}
      />
      {[
        [-0.32, 0.25],
        [0.36, -0.2],
        [0.1, 0.4],
      ].map(([fx_, fz], shardIndex) => (
        <mesh
          key={shardIndex}
          geometry={geometries.shard}
          material={materials.rock}
          position={[fx_ * width, -1.9 - shardIndex * 0.5, fz * depth]}
          rotation={[Math.PI, shardIndex, 0]}
          scale={0.7 + shardIndex * 0.25}
        />
      ))}
    </group>
  );
}

/** Translates game events into particles anchored on the board. */
function BoardFxDirector({
  frame,
  theme,
  puzzleSize,
}: {
  frame: BoardFrame;
  theme: WorldTheme;
  puzzleSize: number;
}) {
  const context = useRef({ frame, theme });

  useEffect(() => {
    context.current = { frame, theme };
  }, [frame, theme]);

  useEffect(() => {
    const timers = new Set<number>();
    const later = (delay: number, run: () => void) => {
      if (delay <= 0) {
        run();
        return;
      }
      const id = window.setTimeout(() => {
        timers.delete(id);
        run();
      }, delay);
      timers.add(id);
    };

    const unsubscribe = onFx((event) => {
      const { frame: f, theme: t } = context.current;

      switch (event.type) {
        case "mark": {
          const x = f.colX(event.col);
          const z = f.rowZ(event.row);
          later(event.delayMs, () => {
            if (event.mark === "selected") {
              const heat = Math.min(event.streak, 12);
              fx.sparks([x, TILE_HEIGHT + 0.3, z], {
                count: 14 + heat * 2,
                speed: 2.6 + heat * 0.15,
                lift: 2.2,
                colors: [t.crystal, t.spark, "#ffffff"],
                size: 7 + heat * 0.3,
              });
              fx.ring([x, TILE_HEIGHT + 0.25, z], t.crystal, 1.5 + heat * 0.08);
              if (event.source === "hint") {
                fx.beam([x, 0, z], "#fff2a8", 9);
              } else if (event.streak > 0 && event.streak % 5 === 0) {
                fx.beam([x, 0, z], t.crystal, 6);
              }
            } else {
              fx.debris([x, TILE_HEIGHT * 0.6, z], t.tile, event.source === "auto" ? 7 : 11);
              fx.sparks([x, TILE_HEIGHT, z], {
                count: event.source === "auto" ? 5 : 9,
                speed: 1.2,
                lift: 0.6,
                gravity: -1,
                colors: [t.erased, t.tile],
                size: 9,
                life: 0.7,
              });
              if (event.source === "hint") {
                fx.beam([x, 0, z], "#fff2a8", 9);
              }
            }
          });
          break;
        }
        case "miss":
          fx.sparks([f.colX(event.col), TILE_HEIGHT + 0.2, f.rowZ(event.row)], {
            count: 26,
            speed: 3.8,
            lift: 1,
            colors: ["#ff4040", "#ff9a7a", "#ffffff"],
            size: 8,
          });
          fx.ring([f.colX(event.col), TILE_HEIGHT + 0.2, f.rowZ(event.row)], "#ff4040", 2.4);
          break;
        case "blocked":
          fx.ring([f.colX(event.col), TILE_HEIGHT + 0.1, f.rowZ(event.row)], "#9aa4b5", 1.1);
          break;
        case "lineMatched":
          later(event.delayMs, () => {
            const pillar: [number, number, number] =
              event.axis === "row"
                ? [f.pillarX, PILLAR_HEIGHT + 0.1, f.rowZ(event.index)]
                : [f.colX(event.index), PILLAR_HEIGHT + 0.1, f.pillarZ];
            const end: [number, number, number] =
              event.axis === "row"
                ? [f.colX(f.size - 1), TILE_HEIGHT + 0.5, f.rowZ(event.index)]
                : [f.colX(event.index), TILE_HEIGHT + 0.5, f.rowZ(f.size - 1)];
            fx.beam([pillar[0], 0, pillar[2]], t.crystal, 10);
            fx.sweep([pillar[0], TILE_HEIGHT + 0.5, pillar[2]], end, t.crystal);
            fx.sparks(pillar, {
              count: 40,
              speed: 4,
              lift: 3,
              colors: [t.crystal, t.spark, "#ffffff"],
              size: 9,
              life: 1.2,
            });
          });
          break;
        case "win": {
          const span = f.width / 2;
          for (let burst = 0; burst < 14; burst += 1) {
            later(150 + burst * 170 + Math.random() * 120, () => {
              const position: [number, number, number] = [
                (Math.random() - 0.5) * span * 2.2,
                3 + Math.random() * 3,
                (Math.random() - 0.5) * span * 1.6,
              ];
              fx.sparks(position, {
                count: 60,
                speed: 6,
                lift: 0.5,
                gravity: -3,
                spread: 0.1,
                colors: [t.crystal, t.spark, "#ffffff", t.accent],
                size: 10,
                life: 1.5,
              });
            });
          }
          break;
        }
        case "lose":
          for (let index = 0; index < 6; index += 1) {
            later(index * 90, () =>
              fx.sparks(
                [(Math.random() - 0.5) * f.width, 0.6, (Math.random() - 0.5) * f.depth],
                { count: 12, speed: 1.2, lift: 0.4, colors: ["#5a5f6e", "#2b2f3a"], size: 14, gravity: 0.4, life: 1.6 },
              ),
            );
          }
          break;
        default:
          break;
      }
    });

    return () => {
      unsubscribe();
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [puzzleSize]);

  return null;
}

export function Board({
  session,
  theme,
  mode,
  hoverCell,
  focusCell,
  streak,
  reducedMotion,
  onHoverCell,
  onCellPress,
}: {
  session: SessionState;
  theme: WorldTheme;
  mode: ToolMode;
  hoverCell: CellRef | null;
  focusCell: CellRef | null;
  streak: number;
  reducedMotion: boolean;
  onHoverCell: Dispatch<SetStateAction<CellRef | null>>;
  onCellPress: (row: number, col: number, alternate: boolean) => void;
}) {
  const { puzzle, marks } = session;
  const frame = useMemo(() => getBoardFrame(puzzle.size), [puzzle.size]);
  const spotlight = getSpotlightProgress(puzzle, marks);
  const pointer = hoverCell ?? focusCell;

  const handleHover = (row: number, col: number, hovering: boolean) => {
    if (hovering) {
      onHoverCell({ row, col });
      document.body.style.cursor =
        marks[row][col] === "hidden" && !getCellBlock(session, row, col) ? "pointer" : "not-allowed";
    } else {
      // Functional update: a fast flick can leave before hover state re-renders.
      onHoverCell((current) => (current?.row === row && current.col === col ? null : current));
      document.body.style.cursor = "";
    }
  };

  useEffect(
    () => () => {
      document.body.style.cursor = "";
    },
    [],
  );

  const pillarFor = (axis: TargetAxis, index: number) => {
    const target = getVisibleTarget(puzzle, marks, axis, index);
    const ciphered = target !== null && isTargetCiphered(puzzle, marks, axis);

    return (
      <TargetPillar
        key={`${axis}-${index}`}
        axis={axis}
        index={index}
        x={axis === "row" ? frame.pillarX : frame.colX(index)}
        z={axis === "row" ? frame.rowZ(index) : frame.pillarZ}
        target={target}
        concealment={getTargetConcealment(puzzle, marks, axis, index)}
        factors={ciphered && target !== null ? getPrimeFactors(target) : undefined}
        progress={
          axis === "row" ? getRowProgress(puzzle, marks, index) : getColProgress(puzzle, marks, index)
        }
        progressHidden={isProgressHidden(puzzle, marks, axis, index)}
        resolved={axis === "row" ? isRowResolved(puzzle, marks, index) : isColResolved(puzzle, marks, index)}
        highlighted={pointer !== null && (axis === "row" ? pointer.row === index : pointer.col === index)}
        theme={theme}
        introDelay={150 + index * 70 + (axis === "column" ? 35 : 0)}
        reducedMotion={reducedMotion}
      />
    );
  };

  return (
    <group>
      <BoardBase frame={frame} theme={theme} />
      <BoardFxDirector frame={frame} theme={theme} puzzleSize={puzzle.size} />

      {Array.from({ length: puzzle.size }, (_, index) => pillarFor("row", index))}
      {Array.from({ length: puzzle.size }, (_, index) => pillarFor("column", index))}

      <ComboEmblem frame={frame} theme={theme} streak={streak} reducedMotion={reducedMotion} />

      {marks.map((line, row) =>
        line.map((mark, col) => {
          const block = mark === "hidden" ? getCellBlock(session, row, col) : null;
          const onSpotlightLine =
            spotlight !== null &&
            !spotlight.complete &&
            (spotlight.axis === "row" ? spotlight.index === row : spotlight.index === col);
          const focusKey = session.focusKey ?? "";
          const sweepIndex = session.autoCleared.findIndex(
            (cell) => cell.row === row && cell.col === col,
          );

          return (
            <Tile
              key={`${row}-${col}`}
              row={row}
              col={col}
              x={frame.colX(col)}
              z={frame.rowZ(row)}
              value={puzzle.board[row][col]}
              mark={mark}
              block={block}
              locked={isCellLocked(puzzle, row, col)}
              theme={theme}
              mode={mode}
              status={session.status}
              hovered={hoverCell?.row === row && hoverCell.col === col}
              inCrosshair={
                pointer !== null &&
                (pointer.row === row || pointer.col === col) &&
                !(pointer.row === row && pointer.col === col)
              }
              spotlit={onSpotlightLine && !isCellBlockedBySpotlight(puzzle, marks, row, col)}
              missKey={focusKey.startsWith(`${row}-${col}-miss-`) ? focusKey : null}
              hintKey={focusKey.startsWith(`${row}-${col}-hint-`) ? focusKey : null}
              sweepDelay={sweepIndex >= 0 ? 80 + sweepIndex * 45 : null}
              introDelay={320 + (row + col) * 55}
              reducedMotion={reducedMotion}
              onPress={onCellPress}
              onHover={handleHover}
            />
          );
        }),
      )}

      {spotlight && !spotlight.complete && (
        <LineCurtain
          axis={spotlight.axis}
          index={spotlight.index}
          frame={frame}
          color="#ffd84a"
          height={3.2}
          opacity={0.55}
        />
      )}
      {session.activeCommitment && (
        <LineCurtain
          axis={session.activeCommitment.axis}
          index={session.activeCommitment.index}
          frame={frame}
          color="#59b8ff"
          height={1.2}
          opacity={0.6}
        />
      )}
      {session.noEchoLine && (
        <LineCurtain
          axis={session.noEchoLine.axis}
          index={session.noEchoLine.index}
          frame={frame}
          color="#ff4a4a"
          height={1.6}
          opacity={0.5}
        />
      )}

      <KeyboardCursor
        cell={focusCell}
        frame={frame}
        color={mode === "select" ? theme.crystal : "#ff8a7a"}
      />
    </group>
  );
}
