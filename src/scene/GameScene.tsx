import { Suspense, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, ToneMapping, Vignette } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { easing } from "maath";
import { PCFShadowMap, PerspectiveCamera, Vector3 } from "three";
import type { GameStatus, SessionState, ThemeMode } from "../appState";
import type { ToolMode } from "../game";
import { Board, type CellRef } from "./Board";
import { Effects } from "./Effects";
import { onFx } from "./fxBus";
import { getBoardFrame, getFitDistance, type StageRect } from "./layout";
import { World } from "./World";
import type { WorldTheme } from "./worlds";

const FOV = 36;
const LOOK_AT = new Vector3(0, 0.35, 0);
/** Render at the screen's real density; phones are often 2.5–3×. */
const NATIVE_DPR = Math.min(window.devicePixelRatio || 1, 3);
/** Touch screens have no hover, so pointer parallax would jolt on every tap. */
const TOUCH_ONLY = window.matchMedia("(hover: none)").matches;

/**
 * 2: post-processing at native resolution, 1: no post-processing, 0: reduced
 * resolution as well. Effects go first so text stays crisp as long as possible.
 */
type QualityTier = 0 | 1 | 2;

function CameraRig({
  boardSize,
  stage,
  status,
  reducedMotion,
}: {
  boardSize: number;
  stage: StageRect | null;
  status: GameStatus;
  reducedMotion: boolean;
}) {
  const size = useThree((state) => state.size);
  const getState = useThree((state) => state.get);
  const motion = useRef({
    shake: 0,
    kick: 0,
    introAt: 0,
    wonAt: -1,
    position: new Vector3(0, 30, 30),
    look: LOOK_AT.clone(),
  });

  useEffect(() => {
    return onFx((event) => {
      const state = motion.current;
      if (event.type === "miss") {
        state.shake = Math.max(state.shake, 1);
      } else if (event.type === "lineMatched") {
        state.kick = Math.max(state.kick, 0.5);
      } else if (event.type === "levelStart") {
        state.introAt = performance.now();
      } else if (event.type === "lose") {
        state.shake = Math.max(state.shake, 0.7);
      }
    });
  }, []);

  useEffect(() => {
    // The first levelStart can fire before the canvas mounts this rig.
    motion.current.introAt = performance.now();
  }, []);

  useEffect(() => {
    motion.current.wonAt = status === "won" ? performance.now() : -1;
  }, [status]);

  // Centre the projection on the free stage so the HUD never covers the board.
  useEffect(() => {
    const camera = getState().camera as PerspectiveCamera;
    const rect = stage ?? { x: 0, y: 0, width: size.width, height: size.height };
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    camera.setViewOffset(
      size.width,
      size.height,
      size.width / 2 - cx,
      size.height / 2 - cy,
      size.width,
      size.height,
    );
    camera.updateProjectionMatrix();
  }, [getState, size.height, size.width, stage]);

  useFrame((state, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const camera = state.camera;
    const m = motion.current;
    const now = performance.now();
    const frame = getBoardFrame(boardSize);
    const rect = stage ?? { x: 0, y: 0, width: size.width, height: size.height };
    // Portrait is width-bound, so a steeper view costs nothing vertically and
    // keeps the numbers less foreshortened.
    const portrait = rect.height > rect.width * 1.05;
    let elevation = ((portrait ? 70 : 55) * Math.PI) / 180;
    let azimuth = 0;

    let distance = getFitDistance({
      boardWidth: frame.width + (portrait ? 0.5 : 0.9),
      boardDepth: frame.depth + 0.9,
      boardHeight: 1.6,
      elevation,
      fov: FOV,
      canvasHeight: size.height,
      stage: rect,
      margin: portrait ? 1.02 : 1.1,
    });

    if (!reducedMotion) {
      if (!TOUCH_ONLY) {
        azimuth += state.pointer.x * 0.07;
        elevation += state.pointer.y * 0.035;
      }
      azimuth += Math.sin(state.clock.elapsedTime * 0.25) * (TOUCH_ONLY ? 0.012 : 0.025);

      const intro = Math.min(1, (now - m.introAt) / 1400);
      const easeOut = 1 - (1 - intro) ** 3;
      distance *= 1 + (1 - easeOut) * 0.55;
      azimuth += (1 - easeOut) * -0.5;
      elevation += (1 - easeOut) * 0.18;

      if (m.wonAt > 0) {
        const t = (now - m.wonAt) / 1000;
        azimuth += Math.sin(Math.min(t, 6) * 0.55) * 0.42;
        distance *= 1 - Math.min(0.08, t * 0.04);
      }
    }

    const target = new Vector3(
      LOOK_AT.x + Math.sin(azimuth) * Math.cos(elevation) * distance,
      LOOK_AT.y + Math.sin(elevation) * distance,
      LOOK_AT.z + Math.cos(azimuth) * Math.cos(elevation) * distance,
    );
    easing.damp3(m.position, target, 0.35, delta);
    camera.position.copy(m.position);

    m.shake = Math.max(0, m.shake - delta * 2.6);
    m.kick = Math.max(0, m.kick - delta * 3);
    const shake = reducedMotion ? 0 : m.shake ** 2 * 0.22 + m.kick ** 2 * 0.06;
    const time = state.clock.elapsedTime;
    camera.position.x += Math.sin(time * 61) * shake;
    camera.position.y += Math.sin(time * 47 + 1) * shake * 0.6;
    camera.lookAt(LOOK_AT);
  });

  return null;
}

export function GameScene({
  session,
  runId,
  theme,
  themeMode,
  mode,
  hoverCell,
  focusCell,
  streak,
  stage,
  reducedMotion,
  onHoverCell,
  onCellPress,
}: {
  session: SessionState;
  runId: number;
  theme: WorldTheme;
  themeMode: ThemeMode;
  mode: ToolMode;
  hoverCell: CellRef | null;
  focusCell: CellRef | null;
  streak: number;
  stage: StageRect | null;
  reducedMotion: boolean;
  onHoverCell: Dispatch<SetStateAction<CellRef | null>>;
  onCellPress: (row: number, col: number, alternate: boolean) => void;
}) {
  const [tier, setTier] = useState<QualityTier>(2);
  const dpr = tier === 0 ? Math.max(1, NATIVE_DPR * 0.7) : NATIVE_DPR;

  return (
    <Canvas
      className="!fixed inset-0 touch-none"
      shadows={{ type: PCFShadowMap }}
      dpr={dpr}
      camera={{ fov: FOV, near: 0.1, far: 400, position: [0, 30, 30] }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onContextMenu={(event) => event.preventDefault()}
      onPointerMissed={() => onHoverCell(null)}
    >
      <PerformanceMonitor
        onDecline={() => setTier((current) => (current > 0 ? ((current - 1) as QualityTier) : 0))}
        onIncline={() => setTier((current) => (current === 0 ? 1 : current))}
        flipflops={3}
        onFallback={() => setTier((current) => (current === 2 ? 1 : current))}
      />

      <Environment resolution={128} frames={1} environmentIntensity={0.35}>
        <Lightformer intensity={2.2} position={[0, 6, 2]} scale={[12, 3, 1]} form="rect" />
        <Lightformer intensity={1.2} position={[-6, 2, 4]} scale={[4, 6, 1]} form="rect" />
        <Lightformer intensity={0.8} position={[6, 1, -4]} scale={[4, 4, 1]} form="circle" color="#ffe7c2" />
      </Environment>

      <World theme={theme} mode={themeMode} />
      <CameraRig
        boardSize={session.puzzle.size}
        stage={stage}
        status={session.status}
        reducedMotion={reducedMotion}
      />

      <Suspense fallback={null}>
        <Board
          key={`${session.puzzle.id}-${runId}`}
          session={session}
          theme={theme}
          mode={mode}
          hoverCell={hoverCell}
          focusCell={focusCell}
          streak={streak}
          reducedMotion={reducedMotion}
          onHoverCell={onHoverCell}
          onCellPress={onCellPress}
        />
      </Suspense>
      <Effects />

      {tier === 2 && (
        // Dense screens barely alias, and MSAA there costs a lot of fill rate.
        <EffectComposer multisampling={NATIVE_DPR >= 2 ? 0 : 4}>
          {/* Only emissive crystals and sparks clear this; lit tiles stay crisp. */}
          <Bloom mipmapBlur intensity={0.9} luminanceThreshold={1.05} luminanceSmoothing={0.12} radius={0.65} />
          <Vignette offset={0.32} darkness={0.55} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
