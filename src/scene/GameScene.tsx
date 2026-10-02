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
    const portrait = rect.height > rect.width * 1.05;
    let elevation = ((portrait ? 64 : 55) * Math.PI) / 180;
    let azimuth = 0;

    let distance = getFitDistance({
      boardWidth: frame.width + 0.9,
      boardDepth: frame.depth + 0.9,
      boardHeight: 1.6,
      elevation,
      fov: FOV,
      canvasHeight: size.height,
      stage: rect,
      margin: portrait ? 1.08 : 1.14,
    });

    if (!reducedMotion) {
      azimuth += state.pointer.x * 0.07 + Math.sin(state.clock.elapsedTime * 0.25) * 0.025;
      elevation += state.pointer.y * 0.035;

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
  const [quality, setQuality] = useState<"high" | "low">("high");
  const [dpr, setDpr] = useState(() => Math.min(window.devicePixelRatio, 2));

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
        onDecline={() => {
          setQuality("low");
          setDpr((current) => Math.max(1, current * 0.75));
        }}
        onIncline={() => setDpr((current) => Math.min(window.devicePixelRatio, 2, current * 1.15))}
        flipflops={3}
        onFallback={() => {
          setQuality("low");
          setDpr(1);
        }}
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

      {quality === "high" && (
        <EffectComposer multisampling={4}>
          <Bloom mipmapBlur intensity={0.85} luminanceThreshold={0.92} luminanceSmoothing={0.18} radius={0.7} />
          <Vignette offset={0.32} darkness={0.55} />
          <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        </EffectComposer>
      )}
    </Canvas>
  );
}
