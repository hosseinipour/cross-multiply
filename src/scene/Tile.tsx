import { useEffect, useMemo, useRef } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { easing } from "maath";
import {
  AdditiveBlending,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  MeshPhysicalMaterial,
  RingGeometry,
} from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import type { CellBlock } from "../cellState";
import type { CellMark, ToolMode } from "../game";
import type { GameStatus } from "../appState";
import { vibrateOnButtonPress } from "../components/haptics";
import { fx } from "./fx";
import { TILE_HEIGHT, TILE_SIZE } from "./layout";
import { FONT_BOLD, getBoardSurface, getSoftDotTexture, getSurfaceTexture } from "./textures";
import type { WorldTheme } from "./worlds";

const LONG_PRESS_MS = 420;
const TAP_SLOP_PX = 12;
const tileGeometry = new RoundedBoxGeometry(TILE_SIZE, TILE_HEIGHT, TILE_SIZE, 4, 0.13);
const sealGeometry = new RoundedBoxGeometry(TILE_SIZE * 1.08, TILE_HEIGHT * 1.7, TILE_SIZE * 1.08, 3, 0.16);
const studGeometry = new CylinderGeometry(0.06, 0.07, 0.05, 10);
const chargeGeometry = new RingGeometry(0.36, 0.47, 40);
const STUD_OFFSETS = [
  [-0.36, -0.36],
  [0.36, -0.36],
  [-0.36, 0.36],
  [0.36, 0.36],
] as const;
const DANGER = new Color("#ff3b3b");
const WHITE = new Color("#ffffff");
const CLOAK = new Color("#8a46d6");
const SEAL = new Color("#7fd8ff");
const SUCCESS_GOLD = new Color("#ffd75e");

export type TileProps = {
  row: number;
  col: number;
  x: number;
  z: number;
  value: number;
  mark: CellMark;
  block: CellBlock | null;
  locked: boolean;
  theme: WorldTheme;
  mode: ToolMode;
  status: GameStatus;
  hovered: boolean;
  inCrosshair: boolean;
  spotlit: boolean;
  missKey: string | null;
  hintKey: string | null;
  sweepDelay: number | null;
  introDelay: number;
  reducedMotion: boolean;
  onPress: (row: number, col: number, alternate: boolean) => void;
  onHover: (row: number, col: number, hovering: boolean) => void;
};

export function Tile({
  row,
  col,
  x,
  z,
  value,
  mark,
  block,
  locked,
  theme,
  mode,
  status,
  hovered,
  inCrosshair,
  spotlit,
  missKey,
  hintKey,
  sweepDelay,
  introDelay,
  reducedMotion,
  onPress,
  onHover,
}: TileProps) {
  const group = useRef<Group>(null);
  const body = useRef<Mesh>(null);
  const seal = useRef<Mesh>(null);
  const glow = useRef<Mesh>(null);
  const charge = useRef<Mesh>(null);
  const cloakA = useRef<Mesh>(null);
  const cloakB = useRef<Mesh>(null);

  const anim = useRef({
    mountedAt: 0,
    markChangedAt: 0,
    displayed: mark,
    missAt: -1e9,
    hintAt: -1e9,
    pressedAt: -1,
    pointerType: "mouse",
    cancelGesture: () => {},
    wonAt: -1,
    lastBlock: block,
    lastMark: mark,
    lastMiss: missKey,
    lastHint: hintKey,
  });

  const surface = getBoardSurface(theme.id);
  const materials = useMemo(() => {
    const soft = getSoftDotTexture();
    return {
      body: surface
        ? new MeshPhysicalMaterial({
            color: theme.tile,
            roughness: surface.roughness,
            metalness: surface.metalness,
            clearcoat: surface.clearcoat,
            clearcoatRoughness: 0.18,
            bumpMap: getSurfaceTexture(surface.kind),
            bumpScale: surface.bump,
          })
        : new MeshStandardMaterial({ color: theme.tile, roughness: 0.5, metalness: 0.05 }),
      seal: new MeshStandardMaterial({
        color: SEAL,
        emissive: SEAL,
        emissiveIntensity: 0.25,
        transparent: true,
        opacity: 0.42,
        roughness: 0.1,
        metalness: 0.3,
        depthWrite: false,
      }),
      glow: new MeshBasicMaterial({
        map: soft,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: AdditiveBlending,
        toneMapped: false,
      }),
      charge: new MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0,
        depthWrite: false,
        toneMapped: false,
      }),
      cloak: new MeshBasicMaterial({
        map: soft,
        color: CLOAK,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
      stud: new MeshStandardMaterial({ color: "#e8b93a", metalness: 0.85, roughness: 0.28 }),
    };
    // Colours are damped toward the theme every frame, so this only seeds them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
    },
    [materials],
  );

  const materialState = useRef(materials);
  useEffect(() => {
    materialState.current = materials;
  }, [materials]);

  // Track the transitions that need a one-shot reaction.
  useEffect(() => {
    const state = anim.current;
    const now = performance.now();
    const top: [number, number, number] = [x, TILE_HEIGHT, z];

    if (state.lastMark !== mark) {
      state.lastMark = mark;
      state.markChangedAt = now;
    }

    if (state.lastBlock !== block) {
      const wasDelayed = state.lastBlock === "seal" || state.lastBlock === "cloak";
      if (wasDelayed && block !== "seal" && block !== "cloak") {
        fx.sparks(top, {
          count: 22,
          colors: state.lastBlock === "seal" ? ["#bff0ff", "#ffffff"] : ["#d6a8ff", "#ffffff"],
          speed: 3.5,
          lift: 1.5,
        });
        if (state.lastBlock === "seal") {
          fx.debris(top, "#bfefff", 8);
        }
      }
      state.lastBlock = block;
    }

    if (missKey && state.lastMiss !== missKey) {
      state.missAt = now;
    }
    state.lastMiss = missKey;

    if (hintKey && state.lastHint !== hintKey) {
      state.hintAt = now;
    }
    state.lastHint = hintKey;

    if (status === "won" && state.wonAt < 0) {
      state.wonAt = now;
    } else if (status !== "won") {
      state.wonAt = -1;
    }
  }, [block, hintKey, mark, missKey, status, x, z]);

  // Timers outlive renders, so they always call the newest press handler.
  const latestPress = useRef(onPress);
  useEffect(() => {
    latestPress.current = onPress;
  });

  // A board swap mid-press must not land the gesture on the next board.
  useEffect(() => {
    const state = anim.current;
    return () => state.cancelGesture();
  }, []);

  const target = useMemo(
    () => ({
      color: new Color(),
      emissive: new Color(),
      glowColor: new Color(),
      crystal: new Color(),
      erased: new Color(),
    }),
    [],
  );

  useFrame((frame, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    const g = group.current;
    const mats = materialState.current;
    if (!g) {
      return;
    }

    const state = anim.current;
    const now = performance.now();
    const time = frame.clock.elapsedTime;
    // The drop-in clock starts on the first rendered frame.
    state.mountedAt ||= now;

    // Auto-cleared tiles wait for their turn in the sweep before crumbling.
    let shown: CellMark = mark;
    if (
      mark === "erased" &&
      sweepDelay !== null &&
      now - state.markChangedAt < sweepDelay
    ) {
      shown = "hidden";
    }
    state.displayed = shown;

    const open = shown === "hidden" && block === null && status === "playing";
    const sinceIntro = now - state.mountedAt - introDelay;
    const introducing = sinceIntro < 0;

    let y = TILE_HEIGHT / 2;
    let squash = 1;
    let tilt = 0;

    if (shown === "selected") {
      y += 0.2 + (reducedMotion ? 0 : Math.sin(time * 2 + row * 0.7 + col * 0.4) * 0.025);
    } else if (shown === "erased") {
      y -= 0.27;
    } else if (block && block !== "seal" && block !== "cloak") {
      y -= 0.08;
    } else if (hovered && open) {
      y += 0.12;
    }

    if (state.pressedAt > 0 && open) {
      squash = 0.82;
      y -= 0.05;
    }

    // Miss: a sharp wobble that decays.
    const sinceMiss = (now - state.missAt) / 1000;
    if (sinceMiss < 0.5 && !reducedMotion) {
      const falloff = 1 - sinceMiss / 0.5;
      tilt = Math.sin(sinceMiss * 48) * 0.16 * falloff;
    }

    // Win: a ripple runs across the solved crystals.
    if (state.wonAt > 0 && shown === "selected" && !reducedMotion) {
      const wave = (now - state.wonAt) / 1000 - (row + col) * 0.07;
      if (wave > 0 && wave < 0.6) {
        y += Math.sin((wave / 0.6) * Math.PI) * 0.55;
      }
    }

    if (introducing) {
      g.position.set(x, 9 + ((row * 7 + col * 3) % 5) * 0.6, z);
      g.visible = false;
    } else {
      g.visible = true;
      easing.damp3(g.position, [x, y, z], introDelay > 0 && sinceIntro < 700 ? 0.12 : 0.09, delta);
    }

    easing.damp3(g.scale, [1, squash, 1], 0.06, delta);
    easing.damp(g.rotation, "z", tilt, 0.02, delta);

    // Colour targets per state.
    const t = target;
    t.crystal.set(theme.crystal);
    t.erased.set(theme.erased);
    t.color.set(theme.tile);
    t.emissive.set("#000000");
    let emissiveIntensity = 0;
    let roughness = surface?.roughness ?? 0.5;
    let glowOpacity = 0;

    if (shown === "selected") {
      t.color.set(theme.crystal);
      t.emissive.set(theme.crystal);
      emissiveIntensity = 0.85 + (reducedMotion ? 0 : Math.sin(time * 2.4 + row + col) * 0.15);
      roughness = surface ? Math.min(0.24, surface.roughness * 0.5) : 0.22;
      glowOpacity = 0.55;
      t.glowColor.set(theme.crystal);
    } else if (shown === "erased") {
      t.color.set(theme.erased);
    } else if (block === "cloak") {
      t.color.lerp(CLOAK, 0.45);
    } else if (block && block !== "seal") {
      t.color.lerp(t.erased, 0.5);
      if (block === "echo") {
        t.color.lerp(DANGER, 0.18);
      }
    } else if (open) {
      if (hovered) {
        t.color.lerp(mode === "select" ? t.crystal : t.erased, 0.28);
        t.emissive.set(mode === "select" ? theme.crystal : "#000000");
        emissiveIntensity = mode === "select" ? 0.12 : 0;
      } else if (inCrosshair) {
        t.color.lerp(WHITE, 0.12);
      }
    }

    if (spotlit && shown === "hidden" && !block) {
      glowOpacity = Math.max(glowOpacity, 0.4 + Math.sin(time * 3) * 0.12);
      t.glowColor.set("#ffe066");
    }

    if (status === "lost" && shown !== "selected") {
      t.color.multiplyScalar(0.6);
    }

    if (state.wonAt > 0 && shown === "selected") {
      t.emissive.lerp(SUCCESS_GOLD, 0.15);
      emissiveIntensity += 0.25;
    }

    if (sinceMiss < 0.55) {
      const flash = 1 - sinceMiss / 0.55;
      t.emissive.lerp(DANGER, flash);
      emissiveIntensity = Math.max(emissiveIntensity, flash * 1.2);
    }

    const sinceHint = (now - state.hintAt) / 1000;
    if (sinceHint < 1.8) {
      const pulse = Math.sin((sinceHint / 1.8) * Math.PI);
      glowOpacity = Math.max(glowOpacity, pulse);
      t.glowColor.set("#fff2a8");
    }

    easing.dampC(mats.body.color, t.color, 0.12, delta);
    easing.dampC(mats.body.emissive, t.emissive, 0.12, delta);
    easing.damp(mats.body, "emissiveIntensity", emissiveIntensity, 0.12, delta);
    easing.damp(mats.body, "roughness", roughness, 0.2, delta);
    if (mats.body instanceof MeshPhysicalMaterial && surface) {
      easing.damp(mats.body, "clearcoat", shown === "selected" ? 1 : surface.clearcoat, 0.2, delta);
    }
    easing.dampC(mats.glow.color, t.glowColor, 0.1, delta);
    easing.damp(mats.glow, "opacity", glowOpacity, 0.12, delta);

    if (glow.current) {
      glow.current.position.y = -g.position.y + 0.02;
      glow.current.visible = mats.glow.opacity > 0.01;
    }

    // Long-press charge ring.
    if (charge.current) {
      const pressing = state.pressedAt > 0 && state.pointerType !== "mouse" && open;
      const progress = pressing ? Math.min(1, (now - state.pressedAt) / LONG_PRESS_MS) : 0;
      mats.charge.opacity = progress * 0.9;
      charge.current.scale.setScalar(0.5 + progress * 0.6);
      charge.current.visible = progress > 0.02;
      mats.charge.color.set(mode === "select" ? "#ff8a7a" : theme.crystal);
    }

    if (seal.current) {
      seal.current.visible = block === "seal";
      mats.seal.emissiveIntensity = 0.25 + Math.sin(time * 2 + col) * 0.08;
    }

    if (cloakA.current && cloakB.current) {
      const visible = block === "cloak";
      cloakA.current.visible = visible;
      cloakB.current.visible = visible;
      if (visible) {
        cloakA.current.rotation.z = time * 0.8;
        cloakB.current.rotation.z = -time * 0.6;
        mats.cloak.opacity = 0.5 + Math.sin(time * 1.7 + row) * 0.2;
      }
    }
  });

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();
    const state = anim.current;
    state.pointerType = event.pointerType;

    if (event.button === 2) {
      return;
    }

    state.pressedAt = performance.now();

    if (event.pointerType === "mouse") {
      return;
    }

    // Touch and pen own the whole gesture instead of relying on the browser's
    // synthesized click. The hold length comes from the events' own
    // timestamps on release, so a busy main thread cannot turn a tap into a
    // long-press. The timer only gives the "armed" haptic cue; the charge
    // ring shows the same thing visually. Sliding away cancels.
    state.cancelGesture();
    const { pointerId, clientX: startX, clientY: startY, timeStamp: downAt } = event.nativeEvent;

    const timer = window.setTimeout(vibrateOnButtonPress, LONG_PRESS_MS);

    const stop = () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      state.pressedAt = -1;
      state.cancelGesture = () => {};
    };
    const moved = (pointer: PointerEvent) =>
      Math.hypot(pointer.clientX - startX, pointer.clientY - startY) > TAP_SLOP_PX;
    const move = (pointer: PointerEvent) => {
      if (pointer.pointerId === pointerId && moved(pointer)) {
        stop();
      }
    };
    const finish = (pointer: PointerEvent) => {
      if (pointer.pointerId !== pointerId) {
        return;
      }
      stop();
      if (pointer.type === "pointerup" && !moved(pointer)) {
        latestPress.current(row, col, pointer.timeStamp - downAt >= LONG_PRESS_MS);
      }
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    state.cancelGesture = stop;
  };

  const inkColor =
    mark === "selected"
      ? theme.crystalInk
      : block === "cloak"
        ? "#f2e6ff"
        : theme.ink;
  const label = block === "cloak" ? "?" : String(value);

  return (
    <group ref={group} position={[x, 9, z]} visible={false}>
      <mesh
        ref={body}
        geometry={tileGeometry}
        material={materials.body}
        castShadow
        receiveShadow
        raycast={(raycaster, hits) => {
          // Tiles still dropping in are invisible but would otherwise catch taps.
          if (group.current?.visible && body.current) {
            Mesh.prototype.raycast.call(body.current, raycaster, hits);
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerUp={(event) => {
          if (event.pointerType === "mouse") {
            anim.current.pressedAt = -1;
          }
        }}
        onPointerLeave={(event) => {
          if (event.pointerType === "mouse") {
            anim.current.pressedAt = -1;
          }
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          if (event.pointerType === "mouse") {
            onHover(row, col, true);
          }
        }}
        onPointerOut={(event) => {
          if (event.pointerType === "mouse") {
            onHover(row, col, false);
          }
        }}
        onClick={(event) => {
          event.stopPropagation();
          // Touch and pen taps are resolved in handlePointerDown.
          if (anim.current.pointerType === "mouse" && event.button === 0) {
            onPress(row, col, false);
          }
        }}
        onContextMenu={(event) => {
          event.stopPropagation();
          event.nativeEvent.preventDefault();
          if (anim.current.pointerType === "mouse") {
            onPress(row, col, true);
          }
        }}
      />

      <Text
        font={FONT_BOLD}
        position={[0, TILE_HEIGHT / 2 + 0.004, 0.02]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={label.length > 1 ? 0.5 : 0.58}
        letterSpacing={-0.03}
        anchorX="center"
        anchorY="middle"
        color={inkColor}
        fillOpacity={mark === "erased" ? 0.32 : 1}
        outlineWidth={mark === "selected" ? 0.012 : 0}
        outlineColor={theme.crystal}
      >
        {label}
      </Text>

      {locked &&
        STUD_OFFSETS.map(([sx, sz]) => (
          <mesh
            key={`${sx}-${sz}`}
            geometry={studGeometry}
            material={materials.stud}
            position={[sx, TILE_HEIGHT / 2 + 0.02, sz]}
            castShadow
          />
        ))}

      <mesh
        ref={seal}
        geometry={sealGeometry}
        material={materials.seal}
        position={[0, 0.08, 0]}
        visible={false}
        raycast={() => null}
      />

      <mesh
        ref={glow}
        rotation={[-Math.PI / 2, 0, 0]}
        material={materials.glow}
        raycast={() => null}
        visible={false}
      >
        <planeGeometry args={[2.1, 2.1]} />
      </mesh>

      <mesh
        ref={charge}
        geometry={chargeGeometry}
        material={materials.charge}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, TILE_HEIGHT / 2 + 0.02, 0]}
        raycast={() => null}
        visible={false}
      />

      <mesh
        ref={cloakA}
        material={materials.cloak}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, TILE_HEIGHT / 2 + 0.06, 0]}
        raycast={() => null}
        visible={false}
      >
        <planeGeometry args={[1.3, 1.3]} />
      </mesh>
      <mesh
        ref={cloakB}
        material={materials.cloak}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0.08, TILE_HEIGHT / 2 + 0.1, -0.05]}
        raycast={() => null}
        visible={false}
      >
        <planeGeometry args={[0.9, 0.9]} />
      </mesh>
    </group>
  );
}
