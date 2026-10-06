import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
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
  OctahedronGeometry,
  RingGeometry,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
} from "three";
import type { TargetAxis } from "../game";
import { FONT_BOLD, getBoardSurface, getSoftDotTexture, getSurfaceTexture } from "./textures";
import type { WorldTheme } from "./worlds";

export const PILLAR_HEIGHT = 0.72;
const CAP_Y = PILLAR_HEIGHT + 0.04;
const FACE_Y = CAP_Y + 0.052;

const baseGeometry = new CylinderGeometry(0.5, 0.58, PILLAR_HEIGHT, 6);
const capGeometry = new CylinderGeometry(0.53, 0.5, 0.09, 6);
const gemGeometry = new OctahedronGeometry(0.17, 0);
const orbGeometry = new SphereGeometry(0.06, 12, 12);
const formatter = new Intl.NumberFormat();
const FOG = new Color("#d8dde6");
const BLIND = new Color("#d65ab4");

export type TargetPillarProps = {
  axis: TargetAxis;
  index: number;
  x: number;
  z: number;
  target: number | null;
  concealment: "blind" | "deepFog" | "fog" | null;
  factors?: number[];
  progress: number;
  progressHidden: boolean;
  resolved: boolean;
  highlighted: boolean;
  theme: WorldTheme;
  introDelay: number;
  reducedMotion: boolean;
};

const SUPERSCRIPTS: Record<number, string> = { 2: "²", 3: "³" };

/** Prime factors as compact powers, split into at most two short rows. */
function getFactorRows(factors: number[]) {
  const powers: string[] = [];
  for (const prime of new Set(factors)) {
    const count = factors.filter((factor) => factor === prime).length;
    powers.push(count === 1 ? String(prime) : `${prime}${SUPERSCRIPTS[count] ?? `^${count}`}`);
  }

  if (powers.join("·").length <= 6 || powers.length === 1) {
    return [powers.join("·")];
  }

  const half = Math.ceil(powers.length / 2);
  return [powers.slice(0, half).join("·"), powers.slice(half).join("·")];
}

/** As large as fits across the hex cap, which matters on phone screens. */
function numberSize(text: string) {
  if (text.length <= 2) return 0.52;
  if (text.length === 3) return 0.44;
  if (text.length <= 5) return 0.32;
  return 0.26;
}

export function TargetPillar({
  axis,
  index,
  x,
  z,
  target,
  concealment,
  factors,
  progress,
  progressHidden,
  resolved,
  highlighted,
  theme,
  introDelay,
  reducedMotion,
}: TargetPillarProps) {
  const group = useRef<Group>(null);
  const gem = useRef<Mesh>(null);
  const orbit = useRef<Group>(null);
  const wisps = useRef<Sprite[]>([]);
  const mountedAt = useRef(0);

  const surface = getBoardSurface(theme.id);
  const materials = useMemo(
    () => ({
      base: new MeshStandardMaterial({
        color: theme.pillar,
        roughness: surface?.roughness ?? 0.75,
        bumpMap: surface ? getSurfaceTexture(surface.kind) : null,
        bumpScale: surface?.bump ?? 0,
        flatShading: true,
      }),
      cap: surface
        ? new MeshPhysicalMaterial({
            color: theme.pillarTop,
            roughness: surface.roughness,
            clearcoat: surface.clearcoat,
            metalness: surface.metalness,
          })
        : new MeshStandardMaterial({ color: theme.pillarTop, roughness: 0.45 }),
      ringTrack: new MeshBasicMaterial({ color: "#000000", transparent: true, opacity: 0.18, depthWrite: false }),
      ringFill: new MeshBasicMaterial({ color: theme.crystal, toneMapped: false }),
      gem: new MeshStandardMaterial({
        color: theme.crystal,
        emissive: theme.crystal,
        emissiveIntensity: 1.2,
        roughness: 0.15,
        metalness: 0.2,
        flatShading: true,
      }),
      wisp: new SpriteMaterial({
        map: getSoftDotTexture(),
        transparent: true,
        depthWrite: false,
        opacity: 0.7,
        blending: AdditiveBlending,
      }),
      orb: new MeshStandardMaterial({ color: theme.spark, emissive: theme.spark, emissiveIntensity: 1 }),
    }),
    // Colours are damped toward the theme every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

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

  const colors = useMemo(
    () => ({
      cap: new Color(),
      emissive: new Color(),
      base: new Color(),
      crystal: new Color(),
    }),
    [],
  );

  const fraction =
    target && target > 1 && !progressHidden && !resolved
      ? Math.min(1, Math.log(progress) / Math.log(target))
      : 0;
  const roundedFraction = Math.round(fraction * 100) / 100;
  const ringGeometries = useMemo(
    () => ({
      track: new RingGeometry(0.56, 0.64, 48, 1),
      fill:
        roundedFraction > 0
          ? new RingGeometry(0.56, 0.64, 48, 1, Math.PI / 2, -Math.PI * 2 * roundedFraction)
          : null,
    }),
    [roundedFraction],
  );

  useEffect(
    () => () => {
      ringGeometries.track.dispose();
      ringGeometries.fill?.dispose();
    },
    [ringGeometries],
  );

  useFrame((frame, rawDelta) => {
    const materials = materialState.current;
    const delta = Math.min(rawDelta, 1 / 20);
    const g = group.current;
    if (!g) {
      return;
    }

    const time = frame.clock.elapsedTime;
    // The intro clock starts on the first rendered frame.
    mountedAt.current ||= performance.now();
    const since = performance.now() - mountedAt.current - introDelay;
    const rise = since < 0 ? -2.4 : 0;
    const lift = highlighted && !resolved ? 0.1 : resolved ? -0.05 : 0;
    easing.damp(g.position, "y", rise + lift, since < 0 ? 0 : 0.14, delta);
    g.visible = since >= 0;

    colors.crystal.set(theme.crystal);
    colors.base.set(theme.pillar);
    colors.cap.set(theme.pillarTop);
    colors.emissive.set("#000000");
    let emissiveIntensity = 0;

    if (resolved) {
      colors.cap.lerp(colors.crystal, 0.7);
      colors.emissive.copy(colors.crystal);
      emissiveIntensity = 0.45;
    } else if (highlighted) {
      colors.emissive.copy(colors.crystal);
      emissiveIntensity = 0.22;
    } else if (concealment === "blind") {
      colors.cap.lerp(BLIND, 0.35);
    }

    easing.dampC(materials.base.color, colors.base, 0.2, delta);
    easing.dampC(materials.cap.color, colors.cap, 0.15, delta);
    easing.dampC(materials.cap.emissive, colors.emissive, 0.15, delta);
    easing.damp(materials.cap, "emissiveIntensity", emissiveIntensity, 0.15, delta);
    easing.dampC(materials.ringFill.color, colors.crystal, 0.2, delta);
    easing.dampC(materials.gem.color, colors.crystal, 0.2, delta);
    easing.dampC(materials.gem.emissive, colors.crystal, 0.2, delta);

    if (gem.current) {
      const targetScale = resolved ? 1 : 0;
      easing.damp(gem.current.scale, "x", targetScale, 0.12, delta);
      gem.current.scale.y = gem.current.scale.x * 1.35;
      gem.current.scale.z = gem.current.scale.x;
      gem.current.visible = gem.current.scale.x > 0.02;
      gem.current.rotation.y = time * 1.4;
      gem.current.position.y = FACE_Y + 0.42 + (reducedMotion ? 0 : Math.sin(time * 2 + index) * 0.06);
    }

    if (orbit.current) {
      orbit.current.rotation.y = time * 0.9;
    }

    const wispColor = concealment === "blind" ? BLIND : FOG;
    wisps.current.forEach((sprite, wispIndex) => {
      if (!sprite) {
        return;
      }
      const angle = time * 0.5 + (wispIndex * Math.PI * 2) / 3;
      sprite.position.set(Math.cos(angle) * 0.32, FACE_Y + 0.18 + Math.sin(time + wispIndex) * 0.06, Math.sin(angle) * 0.32);
      const scale = 0.75 + Math.sin(time * 1.3 + wispIndex) * 0.12;
      sprite.scale.set(scale, scale, 1);
    });
    materials.wisp.color.copy(wispColor);
    materials.wisp.opacity = concealment === "blind" ? 0.55 : 0.4;
  });

  const hidden = target === null;
  const ciphered = !hidden && Boolean(factors?.length) && !resolved;
  const need = !hidden && progress > 1 ? target / progress : null;
  const showNeed = need !== null && !progressHidden && !resolved;
  const label = hidden ? "?" : formatter.format(target);
  const labelColor = resolved ? theme.crystalInk : theme.pillarInk;
  const factorRows = ciphered ? getFactorRows(factors!) : [];
  const ariaName = `${axis === "row" ? "Row" : "Column"} ${index + 1}`;

  return (
    <group ref={group} position={[x, -2.4, z]} visible={false} name={ariaName}>
      <mesh
        geometry={baseGeometry}
        material={materials.base}
        position={[0, PILLAR_HEIGHT / 2, 0]}
        castShadow
        receiveShadow
      />
      <mesh geometry={capGeometry} material={materials.cap} position={[0, CAP_Y, 0]} castShadow receiveShadow />

      {!resolved && !hidden && !progressHidden && (
        <group position={[0, FACE_Y - 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh geometry={ringGeometries.track} material={materials.ringTrack} />
          {ringGeometries.fill && (
            <mesh geometry={ringGeometries.fill} material={materials.ringFill} position={[0, 0, 0.002]} />
          )}
        </group>
      )}

      {ciphered ? (
        <group position={[0, FACE_Y, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          {factorRows.map((rowText, rowIndex) => (
            <Text
              key={`${rowText}-${rowIndex}`}
              font={FONT_BOLD}
              fontSize={Math.min(0.3, 1.15 / Math.max(3, rowText.length))}
              position={[0, ((factorRows.length - 1) / 2 - rowIndex) * 0.27, 0]}
              anchorX="center"
              anchorY="middle"
              color={labelColor}
            >
              {rowText}
            </Text>
          ))}
        </group>
      ) : (
        <Text
          font={FONT_BOLD}
          position={[0, FACE_Y, showNeed ? -0.1 : hidden ? -0.04 : 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={numberSize(label)}
          letterSpacing={-0.02}
          anchorX="center"
          anchorY="middle"
          color={labelColor}
        >
          {label}
        </Text>
      )}

      {showNeed && (
        <Text
          font={FONT_BOLD}
          position={[0, FACE_Y, 0.27]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.25}
          anchorX="center"
          anchorY="middle"
          color={theme.crystal}
          outlineWidth={0.018}
          outlineColor={theme.pillarInk}
        >
          {need === 1 ? "done" : `×${formatter.format(need)}`}
        </Text>
      )}

      {hidden && (
        <Text
          font={FONT_BOLD}
          position={[0, FACE_Y, 0.27]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={0.15}
          letterSpacing={0.14}
          anchorX="center"
          anchorY="middle"
          color={concealment === "blind" ? "#d65ab4" : theme.pillarInk}
        >
          {concealment === "blind" ? "BLIND" : "FOG"}
        </Text>
      )}

      {hidden &&
        [0, 1, 2].map((wispIndex) => (
          <sprite
            key={wispIndex}
            ref={(sprite) => {
              if (sprite) {
                wisps.current[wispIndex] = sprite;
              }
            }}
            material={materials.wisp}
            raycast={() => null}
          />
        ))}

      {ciphered && (
        <group ref={orbit} position={[0, FACE_Y + 0.15, 0]}>
          {factors!.slice(0, 6).map((_, orbIndex, list) => {
            const angle = (orbIndex / list.length) * Math.PI * 2;
            return (
              <mesh
                key={orbIndex}
                geometry={orbGeometry}
                material={materials.orb}
                position={[Math.cos(angle) * 0.62, 0, Math.sin(angle) * 0.62]}
              />
            );
          })}
        </group>
      )}

      <mesh ref={gem} geometry={gemGeometry} material={materials.gem} visible={false} castShadow />
    </group>
  );
}
