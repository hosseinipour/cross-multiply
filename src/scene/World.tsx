import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Float, Stars } from "@react-three/drei";
import { easing } from "maath";
import {
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  Fog,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  MeshStandardMaterial,
  NormalBlending,
  Points,
  ShaderMaterial,
  SpriteMaterial,
} from "three";
import type { ThemeMode } from "../appState";
import { getSoftDotTexture } from "./textures";
import type { AmbientKind, WorldTheme } from "./worlds";

const skyVertex = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  varying vec3 vDirection;
  void main() {
    float h = vDirection.y;
    vec3 colour = h > 0.0
      ? mix(uHorizon, uTop, pow(smoothstep(0.0, 1.0, h), 0.55))
      : mix(uHorizon, uBottom, pow(smoothstep(0.0, 1.0, -h), 0.45));
    gl_FragColor = vec4(colour, 1.0);
  }
`;

const ambientVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform vec3 uVelocity;
  uniform float uSway;
  uniform float uSize;
  uniform float uPixelRatio;
  uniform vec3 uBox;
  varying float vTwinkle;
  void main() {
    vec3 p = position + uVelocity * uTime * (0.6 + aSeed * 0.8);
    p.x += sin(uTime * 0.7 + aSeed * 40.0) * uSway;
    p.z += cos(uTime * 0.5 + aSeed * 30.0) * uSway;
    p = mod(p + uBox * 0.5, uBox) - uBox * 0.5;
    p.y += 2.0;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = uSize * uPixelRatio * (0.5 + aSeed) * (14.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
    vTwinkle = 0.55 + 0.45 * sin(uTime * (1.5 + aSeed * 3.0) + aSeed * 50.0);
  }
`;

const ambientFragment = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vTwinkle;
  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    gl_FragColor = vec4(uColor * 1.3, tex.a * vTwinkle * uOpacity);
  }
`;

const AMBIENT_MOTION: Record<AmbientKind, { velocity: [number, number, number]; sway: number }> = {
  pollen: { velocity: [0.15, 0.25, 0.05], sway: 0.6 },
  sand: { velocity: [1.8, -0.15, 0.4], sway: 0.25 },
  snow: { velocity: [0.2, -1.1, 0.1], sway: 0.7 },
  embers: { velocity: [0.1, 1.3, -0.1], sway: 0.45 },
  stardust: { velocity: [0.05, 0.05, 0.02], sway: 0.2 },
};

const BOX: [number, number, number] = [34, 18, 30];
/** Palettes list hemisphere strength relative to the sun; this sets the mix. */
const HEMI_SCALE = 0.55;

function createAmbientGeometry(count: number) {
  const geometry = new BufferGeometry();
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * BOX[0];
    positions[index * 3 + 1] = (Math.random() - 0.5) * BOX[1];
    positions[index * 3 + 2] = (Math.random() - 0.5) * BOX[2];
    seeds[index] = Math.random();
  }
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));
  return geometry;
}

function AmbientParticles({ theme }: { theme: WorldTheme }) {
  const { kind, color, count, size } = theme.ambient;
  const points = useRef<Points>(null);
  const geometry = useMemo(() => createAmbientGeometry(count), [count]);

  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: ambientVertex,
        fragmentShader: ambientFragment,
        uniforms: {
          uTime: { value: 0 },
          uVelocity: { value: AMBIENT_MOTION.pollen.velocity },
          uSway: { value: 0.5 },
          uSize: { value: 6 },
          uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
          uBox: { value: BOX },
          uMap: { value: getSoftDotTexture() },
          uColor: { value: new Color() },
          uOpacity: { value: 0 },
        },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    [],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    const shader = points.current?.material as ShaderMaterial | undefined;
    if (!shader) {
      return;
    }
    const motion = AMBIENT_MOTION[kind];
    shader.uniforms.uTime.value = state.clock.elapsedTime;
    shader.uniforms.uVelocity.value = motion.velocity;
    shader.uniforms.uSway.value = motion.sway;
    shader.uniforms.uSize.value = size;
    (shader.uniforms.uColor.value as Color).set(color);
    shader.uniforms.uOpacity.value = Math.min(1, shader.uniforms.uOpacity.value + delta);
  });

  return <points ref={points} geometry={geometry} material={material} frustumCulled={false} />;
}

/** Deterministic layout so the sea below never reshuffles between renders. */
const BELOW_PUFFS = (() => {
  let seed = 7;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: 46 }, () => {
    const angle = next() * Math.PI * 2;
    const radius = 6 + next() * 58;
    return {
      position: [Math.cos(angle) * radius, -13 - next() * 16, Math.sin(angle) * radius - 6] as [number, number, number],
      scale: 12 + next() * 18,
      tone: next(),
    };
  });
})();

function SeaBelow({ theme, night }: { theme: WorldTheme; night: boolean }) {
  const group = useRef<Group>(null);
  const { colors, opacity, glow } = theme.below;
  const materials = useMemo(
    () =>
      colors.map((color) => {
        const tint = new Color(color);
        if (night && !glow) {
          tint.multiplyScalar(0.32);
        }
        return new SpriteMaterial({
          map: getSoftDotTexture(),
          color: tint,
          transparent: true,
          opacity,
          depthWrite: false,
          fog: false,
          blending: glow ? AdditiveBlending : NormalBlending,
        });
      }),
    [colors, glow, night, opacity],
  );

  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials]);

  useFrame((_, delta) => {
    if (group.current) {
      group.current.rotation.y += delta * 0.006;
    }
  });

  return (
    <group ref={group}>
      {BELOW_PUFFS.map((puff, index) => (
        <sprite
          key={index}
          material={materials[Math.floor(puff.tone * materials.length)]}
          position={puff.position}
          scale={[puff.scale, puff.scale * 0.55, 1]}
          raycast={() => null}
        />
      ))}
    </group>
  );
}

const rockGeometry = new IcosahedronGeometry(1, 0);
const ROCKS: Array<{ position: [number, number, number]; scale: number; speed: number }> = [
  { position: [-15, -2, -14], scale: 2.2, speed: 0.9 },
  { position: [16, 1, -18], scale: 3, speed: 0.7 },
  { position: [-19, 4, -26], scale: 1.6, speed: 1.1 },
  { position: [13, -5, -6], scale: 1.4, speed: 1.3 },
  { position: [-12, -7, 2], scale: 1.1, speed: 1.2 },
  { position: [22, 6, -32], scale: 2.6, speed: 0.6 },
  { position: [2, 8, -36], scale: 1.8, speed: 0.8 },
];

export function World({ theme, mode }: { theme: WorldTheme; mode: ThemeMode }) {
  const scene = useThree((state) => state.scene);
  const sun = useRef<DirectionalLight>(null);
  const hemi = useRef<HemisphereLight>(null);
  const palette = mode === "dark" ? theme.night : theme.day;
  const night = mode === "dark";

  const sky = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: skyVertex,
        fragmentShader: skyFragment,
        uniforms: {
          uTop: { value: new Color(palette.top) },
          uHorizon: { value: new Color(palette.horizon) },
          uBottom: { value: new Color(palette.bottom) },
        },
        side: BackSide,
        depthWrite: false,
        fog: false,
      }),
    // Seeded once; colours are damped below so world changes cross-fade.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const rockMaterial = useMemo(
    () => new MeshStandardMaterial({ color: theme.rock, roughness: 1, flatShading: true }),
    // Seeded once; damped toward the current world below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const orbMaterial = useMemo(
    () =>
      new SpriteMaterial({
        map: getSoftDotTexture(),
        color: palette.sun,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        fog: false,
      }),
    // Seeded once; damped toward the current palette below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const fog = useMemo(() => new Fog(palette.horizon, 34, 120), []); // eslint-disable-line react-hooks/exhaustive-deps
  const targets = useMemo(
    () => ({
      top: new Color(),
      horizon: new Color(),
      bottom: new Color(),
      sun: new Color(),
      hemiSky: new Color(),
      hemiGround: new Color(),
      rock: new Color(),
    }),
    [],
  );

  useEffect(() => {
    scene.fog = fog;
    return () => {
      scene.fog = null;
    };
  }, [fog, scene]);

  useEffect(
    () => () => {
      sky.dispose();
      rockMaterial.dispose();
      orbMaterial.dispose();
    },
    [orbMaterial, rockMaterial, sky],
  );

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);
    targets.top.set(palette.top);
    targets.horizon.set(palette.horizon);
    targets.bottom.set(palette.bottom);
    targets.sun.set(palette.sun);
    targets.hemiSky.set(palette.hemiSky);
    targets.hemiGround.set(palette.hemiGround);
    targets.rock.set(theme.rock);

    easing.dampC(sky.uniforms.uTop.value, targets.top, 0.6, delta);
    easing.dampC(sky.uniforms.uHorizon.value, targets.horizon, 0.6, delta);
    easing.dampC(sky.uniforms.uBottom.value, targets.bottom, 0.6, delta);
    easing.dampC(fog.color, targets.horizon, 0.6, delta);
    easing.dampC(rockMaterial.color, targets.rock, 0.6, delta);
    easing.dampC(orbMaterial.color, targets.sun, 0.6, delta);

    if (sun.current) {
      easing.dampC(sun.current.color, targets.sun, 0.6, delta);
      easing.damp(sun.current, "intensity", palette.sunIntensity, 0.6, delta);
    }

    if (hemi.current) {
      easing.dampC(hemi.current.color, targets.hemiSky, 0.6, delta);
      easing.dampC(hemi.current.groundColor, targets.hemiGround, 0.6, delta);
      easing.damp(hemi.current, "intensity", palette.hemiIntensity * HEMI_SCALE, 0.6, delta);
    }
  });

  const starry = night || theme.id === "mythic";

  return (
    <>
      <mesh material={sky} scale={160} raycast={() => null} renderOrder={-1}>
        <sphereGeometry args={[1, 32, 16]} />
      </mesh>

      <sprite
        material={orbMaterial}
        position={night ? [-38, 34, -70] : [42, 30, -72]}
        scale={night ? 16 : 30}
        raycast={() => null}
      />

      <hemisphereLight ref={hemi} args={[palette.hemiSky, palette.hemiGround, palette.hemiIntensity * HEMI_SCALE]} />
      <directionalLight
        ref={sun}
        position={[6, 13, 7]}
        intensity={palette.sunIntensity}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-near={1}
        shadow-camera-far={40}
      />

      {starry && (
        <Stars radius={90} depth={40} count={theme.id === "mythic" ? 3200 : 1800} factor={4} saturation={0.4} fade speed={0.6} />
      )}

      {ROCKS.map((rock, index) => (
        <Float key={index} speed={rock.speed} rotationIntensity={0.6} floatIntensity={1.4}>
          <mesh
            geometry={rockGeometry}
            material={rockMaterial}
            position={rock.position}
            scale={[rock.scale, rock.scale * 0.8, rock.scale]}
            rotation={[index, index * 0.7, 0]}
            raycast={() => null}
          />
        </Float>
      ))}

      <SeaBelow theme={theme} night={night} />
      <AmbientParticles key={theme.id} theme={theme} />
    </>
  );
}
