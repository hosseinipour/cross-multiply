import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  CatmullRomCurve3,
  Color,
  Group,
  InstancedMesh,
  MeshStandardMaterial,
  Object3D,
  TubeGeometry,
  Vector3,
} from "three";
import type { BoardFrame } from "./layout";
import type { WorldTheme } from "./worlds";

/** All decoration stays on the rim or underneath the playable surface. */
export function IslandDetails({
  frame,
  theme,
  reducedMotion,
}: {
  frame: BoardFrame;
  theme: WorldTheme;
  reducedMotion: boolean;
}) {
  const grass = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const half = (frame.width + 0.7) / 2;
  const placements = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => {
        const side = i % 4;
        const along = (Math.floor(i / 4) / 4 - 0.5) * (frame.width - 0.2);
        return {
          x: side < 2 ? (side === 0 ? -1 : 1) * half : along,
          z: side >= 2 ? (side === 2 ? -1 : 1) * half : along,
          scale: 0.7 + ((i * 7) % 11) / 20,
        };
      }),
    [frame.width, half],
  );

  useFrame(({ clock }) => {
    const time = reducedMotion ? 0 : clock.elapsedTime;
    if (grass.current) {
      for (let i = 0; i < 80; i++) {
        const p = placements[Math.floor(i / 4)];
        dummy.position.set(p.x + Math.sin(i * 7) * 0.07, 0.08, p.z + Math.cos(i * 7) * 0.07);
        dummy.rotation.set(Math.sin(time * 1.8 + i) * 0.13, i * 2.4, Math.sin(time * 1.4 + i * 0.8) * 0.2);
        dummy.scale.set(0.055, 0.24 + (i % 3) * 0.09, 0.055);
        dummy.updateMatrix();
        grass.current.setMatrixAt(i, dummy.matrix);
      }
      grass.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group name={`${theme.name} island details`}>
      {theme.id === "easy" && (
        <>
          <instancedMesh ref={grass} args={[undefined, undefined, 80]} raycast={() => null}>
            <coneGeometry args={[1, 1, 3]} />
            <meshStandardMaterial color="#497c36" roughness={0.9} />
          </instancedMesh>
          {placements
            .filter((_, i) => i % 3 === 0)
            .map((p, i) => (
              <group key={i} position={[p.x, 0.15, p.z]}>
                <mesh raycast={() => null}>
                  <sphereGeometry args={[0.08, 8, 6]} />
                  <meshStandardMaterial color={i % 2 ? "#f2ce6b" : "#efcbd9"} />
                </mesh>
                <mesh position={[0, -0.09, 0]} raycast={() => null}>
                  <cylinderGeometry args={[0.016, 0.016, 0.16, 4]} />
                  <meshStandardMaterial color="#497c36" />
                </mesh>
              </group>
            ))}
        </>
      )}
      {theme.id === "medium" &&
        placements
          .filter((_, i) => i % 2 === 0)
          .map((p, i) => (
            <group key={i} position={[p.x, -0.18, p.z]} rotation={[0, i * 0.6, 0]}>
              <mesh scale={[0.26, 0.2 + p.scale * 0.15, 0.28]} castShadow raycast={() => null}>
                <boxGeometry />
                <meshStandardMaterial color={theme.pillar} roughness={0.95} />
              </mesh>
              <mesh position={[0.03, 0.19, 0]} scale={[0.28, 0.07, 0.29]} raycast={() => null}>
                <boxGeometry />
                <meshStandardMaterial color={theme.pillarTop} roughness={0.9} />
              </mesh>
            </group>
          ))}
      {theme.id === "hard" &&
        placements.map((p, i) => (
          <mesh
            key={i}
            position={[p.x, -0.48, p.z]}
            rotation={[Math.PI, i, i % 2 ? 0.08 : -0.08]}
            scale={[1, p.scale, 1]}
            raycast={() => null}
          >
            <coneGeometry args={[0.13, 0.95, 5]} />
            <meshPhysicalMaterial color="#bcecff" roughness={0.13} metalness={0.12} clearcoat={1} />
          </mesh>
        ))}
      {theme.id === "expert" && <CalderaDetails half={half} reducedMotion={reducedMotion} />}
      {theme.id === "mythic" && <AstralDetails half={half} reducedMotion={reducedMotion} />}
    </group>
  );
}

function CalderaDetails({ half, reducedMotion }: { half: number; reducedMotion: boolean }) {
  const basalt = useRef<InstancedMesh>(null);
  const lava = useRef<Array<MeshStandardMaterial | null>>([]);
  const seams = useMemo(() => {
    return Array.from({ length: 4 }, (_, side) => {
      const points = Array.from({ length: 13 }, (_, index) => {
        const along = (index / 12 - 0.5) * (half * 2 - 0.28);
        const edge = half - 0.14 + Math.sin(index * 2.4 + side) * 0.045;
        return new Vector3(
          side < 2 ? (side === 0 ? -edge : edge) : along,
          0.012,
          side >= 2 ? (side === 2 ? -edge : edge) : along,
        );
      });
      return new TubeGeometry(new CatmullRomCurve3(points), 24, 0.022, 4, false);
    });
  }, [half]);

  useEffect(() => () => seams.forEach((geometry) => geometry.dispose()), [seams]);

  useEffect(() => {
    if (!basalt.current) return;
    const dummy = new Object3D();
    for (let i = 0; i < 16; i++) {
      const side = i % 4;
      const along = (Math.floor(i / 4) / 3 - 0.5) * half * 1.65;
      dummy.position.set(
        side < 2 ? (side === 0 ? -half : half) : along,
        -0.25,
        side >= 2 ? (side === 2 ? -half : half) : along,
      );
      dummy.rotation.set(i * 0.4, i * 1.7, 0.2);
      dummy.scale.set(0.65, 0.9 + (i % 3) * 0.18, 0.7);
      dummy.updateMatrix();
      basalt.current.setMatrixAt(i, dummy.matrix);
    }
    basalt.current.instanceMatrix.needsUpdate = true;
  }, [half]);

  useFrame(({ clock }) => {
    const intensity = 1.4 + (reducedMotion ? 0 : Math.sin(clock.elapsedTime * 1.3) * 0.18);
    for (const material of lava.current) {
      if (material) material.emissiveIntensity = intensity;
    }
  });

  return (
    <group name="Caldera board rim">
      <instancedMesh ref={basalt} args={[undefined, undefined, 16]} raycast={() => null}>
        <dodecahedronGeometry args={[0.26, 0]} />
        <meshStandardMaterial color="#342b28" roughness={0.95} flatShading />
      </instancedMesh>
      {seams.map((geometry, index) => (
        <mesh key={index} geometry={geometry} raycast={() => null}>
          <meshStandardMaterial
            ref={(material) => { lava.current[index] = material; }}
            color="#ffb65c"
            emissive="#ff681e"
            emissiveIntensity={1.4}
            roughness={0.7}
          />
        </mesh>
      ))}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * (half - 0.1), -0.55, 0]} raycast={() => null}>
          <boxGeometry args={[0.025, 0.045, half * 1.7]} />
          <meshStandardMaterial color="#ff8a3a" emissive="#ff541a" emissiveIntensity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function AstralDetails({ half, reducedMotion }: { half: number; reducedMotion: boolean }) {
  const crystals = useRef<InstancedMesh>(null);
  const floatingCrystals = useRef<Group>(null);

  useEffect(() => {
    if (!crystals.current) return;
    const dummy = new Object3D();
    const color = new Color();
    for (let i = 0; i < 16; i++) {
      const side = i % 4;
      const along = (Math.floor(i / 4) / 3 - 0.5) * half * 1.7;
      dummy.position.set(
        side < 2 ? (side === 0 ? -half : half) : along,
        -0.12 + (i % 2) * 0.06,
        side >= 2 ? (side === 2 ? -half : half) : along,
      );
      dummy.rotation.set(0.12, i * 1.7, side < 2 ? 0.18 : -0.18);
      dummy.scale.set(0.6, 1.1 + (i % 3) * 0.18, 0.6);
      dummy.updateMatrix();
      crystals.current.setMatrixAt(i, dummy.matrix);
      crystals.current.setColorAt(i, color.set(i % 2 ? "#87dcf5" : "#b389ed"));
    }
    crystals.current.instanceMatrix.needsUpdate = true;
    if (crystals.current.instanceColor) crystals.current.instanceColor.needsUpdate = true;
  }, [half]);

  useFrame(({ clock }) => {
    if (floatingCrystals.current) {
      floatingCrystals.current.position.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 1.1) * 0.025;
    }
  });

  return (
    <group name="Astral board rim">
      <group ref={floatingCrystals}>
        <instancedMesh ref={crystals} args={[undefined, undefined, 16]} raycast={() => null}>
          <octahedronGeometry args={[0.25, 0]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#65449a"
            emissiveIntensity={0.5}
            roughness={0.28}
            metalness={0.45}
            flatShading
          />
        </instancedMesh>
      </group>
      {[0, 1].map((index) => (
        <mesh
          key={index}
          position={[0, -0.7 - index * 0.14, 0]}
          rotation={[Math.PI / 2 + (index ? 0.07 : -0.07), 0, 0]}
          raycast={() => null}
        >
          <torusGeometry args={[half * (index ? 0.98 : 1.02), 0.015, 4, 48]} />
          <meshBasicMaterial color={index ? "#8ff3ff" : "#c25cff"} transparent opacity={0.6} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
