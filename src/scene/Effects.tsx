import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  Points,
  ShaderMaterial,
  Vector3,
} from "three";
import { registerEffects, type SparkOptions, type Vec } from "./fx";
import { getSoftDotTexture } from "./textures";

const MAX_SPARKS = 900;
const MAX_DEBRIS = 260;
const MAX_TRANSIENTS = 24;

type Transient = {
  kind: "beam" | "ring" | "sweep";
  start: number;
  duration: number;
  color: Color;
  from: Vector3;
  to: Vector3;
  size: number;
};

const sparkVertex = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying float vAlpha;
  varying vec3 vColor;
  uniform float uPixelRatio;
  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * uPixelRatio * (12.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
    vAlpha = aAlpha;
    vColor = aColor;
  }
`;

const sparkFragment = /* glsl */ `
  uniform sampler2D uMap;
  varying float vAlpha;
  varying vec3 vColor;
  void main() {
    vec4 tex = texture2D(uMap, gl_PointCoord);
    gl_FragColor = vec4(vColor * 1.6, tex.a * vAlpha);
  }
`;

const beamVertex = /* glsl */ `
  varying float vHeight;
  void main() {
    vHeight = uv.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const beamFragment = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vHeight;
  void main() {
    float fade = pow(1.0 - vHeight, 1.6);
    gl_FragColor = vec4(uColor * 1.8, fade * uOpacity);
  }
`;

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function Effects() {
  const pointsRef = useRef<Points>(null);
  const debrisRef = useRef<InstancedMesh>(null);
  const transientGroup = useRef<Group>(null);

  const sparks = useMemo(() => {
    const geometry = new BufferGeometry();
    const positions = new Float32Array(MAX_SPARKS * 3);
    const colors = new Float32Array(MAX_SPARKS * 3);
    const sizes = new Float32Array(MAX_SPARKS);
    const alphas = new Float32Array(MAX_SPARKS);
    geometry.setAttribute("position", new BufferAttribute(positions, 3));
    geometry.setAttribute("aColor", new BufferAttribute(colors, 3));
    geometry.setAttribute("aSize", new BufferAttribute(sizes, 1));
    geometry.setAttribute("aAlpha", new BufferAttribute(alphas, 1));
    const material = new ShaderMaterial({
      vertexShader: sparkVertex,
      fragmentShader: sparkFragment,
      uniforms: {
        uMap: { value: getSoftDotTexture() },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });

    return {
      geometry,
      material,
      positions,
      colors,
      sizes,
      alphas,
      velocity: new Float32Array(MAX_SPARKS * 3),
      life: new Float32Array(MAX_SPARKS),
      maxLife: new Float32Array(MAX_SPARKS),
      baseSize: new Float32Array(MAX_SPARKS),
      gravity: new Float32Array(MAX_SPARKS),
      cursor: 0,
    };
  }, []);

  const debris = useMemo(
    () => ({
      position: new Float32Array(MAX_DEBRIS * 3),
      velocity: new Float32Array(MAX_DEBRIS * 3),
      rotation: new Float32Array(MAX_DEBRIS * 3),
      spin: new Float32Array(MAX_DEBRIS * 3),
      life: new Float32Array(MAX_DEBRIS),
      scale: new Float32Array(MAX_DEBRIS),
      cursor: 0,
      dummy: new Object3D(),
      hidden: new Matrix4().makeScale(0, 0, 0),
    }),
    [],
  );

  const transients = useMemo(() => {
    const beamMaterial = () =>
      new ShaderMaterial({
        vertexShader: beamVertex,
        fragmentShader: beamFragment,
        uniforms: { uColor: { value: new Color() }, uOpacity: { value: 0 } },
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
      });

    return {
      list: [] as Transient[],
      meshes: [] as Mesh[],
      beamMaterial,
    };
  }, []);

  useEffect(() => {
    const color = new Color();
    const mesh = debrisRef.current;

    if (mesh) {
      for (let index = 0; index < MAX_DEBRIS; index += 1) {
        mesh.setMatrixAt(index, debris.hidden);
        mesh.setColorAt(index, color.set("#ffffff"));
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    const spawnSpark = (
      position: Vec,
      velocity: Vec,
      colorValue: string,
      size: number,
      life: number,
      gravity: number,
    ) => {
      const index = sparks.cursor;
      sparks.cursor = (sparks.cursor + 1) % MAX_SPARKS;
      sparks.positions.set(position, index * 3);
      sparks.velocity.set(velocity, index * 3);
      color.set(colorValue);
      sparks.colors[index * 3] = color.r;
      sparks.colors[index * 3 + 1] = color.g;
      sparks.colors[index * 3 + 2] = color.b;
      sparks.baseSize[index] = size;
      sparks.life[index] = life;
      sparks.maxLife[index] = life;
      sparks.gravity[index] = gravity;
    };

    const addTransient = (transient: Transient) => {
      transients.list.push(transient);
      if (transients.list.length > MAX_TRANSIENTS) {
        transients.list.shift();
      }
    };

    return registerEffects({
      sparks(position, options: SparkOptions = {}) {
        const {
          count = 18,
          speed = 3,
          lift = 2,
          spread = 0.35,
          size = 7,
          life = 0.9,
          gravity = -5,
          colors = ["#ffffff"],
        } = options;

        for (let index = 0; index < count; index += 1) {
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(randomRange(-1, 1));
          const magnitude = speed * randomRange(0.35, 1);
          spawnSpark(
            [
              position[0] + randomRange(-spread, spread),
              position[1] + randomRange(0, spread * 0.5),
              position[2] + randomRange(-spread, spread),
            ],
            [
              Math.sin(phi) * Math.cos(theta) * magnitude,
              Math.abs(Math.cos(phi)) * magnitude + lift,
              Math.sin(phi) * Math.sin(theta) * magnitude,
            ],
            colors[index % colors.length],
            size * randomRange(0.6, 1.3),
            life * randomRange(0.7, 1.25),
            gravity,
          );
        }
      },
      debris(position, colorValue, count = 10) {
        const mesh = debrisRef.current;
        if (!mesh) {
          return;
        }

        for (let index = 0; index < count; index += 1) {
          const slot = debris.cursor;
          debris.cursor = (debris.cursor + 1) % MAX_DEBRIS;
          debris.position.set(
            [
              position[0] + randomRange(-0.4, 0.4),
              position[1] + randomRange(0, 0.25),
              position[2] + randomRange(-0.4, 0.4),
            ],
            slot * 3,
          );
          debris.velocity.set(
            [randomRange(-2.4, 2.4), randomRange(2.5, 5.5), randomRange(-2.4, 2.4)],
            slot * 3,
          );
          debris.spin.set(
            [randomRange(-9, 9), randomRange(-9, 9), randomRange(-9, 9)],
            slot * 3,
          );
          debris.life[slot] = randomRange(0.9, 1.4);
          debris.scale[slot] = randomRange(0.07, 0.17);
          color.set(colorValue).offsetHSL(0, 0, randomRange(-0.08, 0.08));
          mesh.setColorAt(slot, color);
        }

        if (mesh.instanceColor) {
          mesh.instanceColor.needsUpdate = true;
        }
      },
      beam(position, colorValue, height = 7) {
        addTransient({
          kind: "beam",
          start: performance.now(),
          duration: 1100,
          color: new Color(colorValue),
          from: new Vector3(...position),
          to: new Vector3(...position),
          size: height,
        });
      },
      ring(position, colorValue, size = 1.6) {
        addTransient({
          kind: "ring",
          start: performance.now(),
          duration: 650,
          color: new Color(colorValue),
          from: new Vector3(...position),
          to: new Vector3(...position),
          size,
        });
      },
      sweep(from, to, colorValue) {
        addTransient({
          kind: "sweep",
          start: performance.now(),
          duration: 520,
          color: new Color(colorValue),
          from: new Vector3(...from),
          to: new Vector3(...to),
          size: 1,
        });
      },
    });
  }, [debris, sparks, transients]);

  useFrame((_, rawDelta) => {
    const delta = Math.min(rawDelta, 1 / 20);

    // Sparks: drag, gravity, fade.
    for (let index = 0; index < MAX_SPARKS; index += 1) {
      if (sparks.life[index] <= 0) {
        sparks.alphas[index] = 0;
        continue;
      }

      sparks.life[index] -= delta;
      const offset = index * 3;
      const drag = 1 - 1.6 * delta;
      sparks.velocity[offset] *= drag;
      sparks.velocity[offset + 1] = sparks.velocity[offset + 1] * drag + sparks.gravity[index] * delta;
      sparks.velocity[offset + 2] *= drag;
      sparks.positions[offset] += sparks.velocity[offset] * delta;
      sparks.positions[offset + 1] += sparks.velocity[offset + 1] * delta;
      sparks.positions[offset + 2] += sparks.velocity[offset + 2] * delta;
      const remaining = Math.max(0, sparks.life[index] / sparks.maxLife[index]);
      sparks.alphas[index] = Math.min(1, remaining * 1.8);
      sparks.sizes[index] = sparks.baseSize[index] * (0.4 + remaining * 0.6);
    }

    const geometry = sparks.geometry;
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aColor.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;

    // Debris: ballistic chips that bounce once on the slab, then sink away.
    const mesh = debrisRef.current;
    if (mesh) {
      for (let index = 0; index < MAX_DEBRIS; index += 1) {
        if (debris.life[index] <= 0) {
          continue;
        }

        debris.life[index] -= delta;
        const offset = index * 3;

        if (debris.life[index] <= 0) {
          mesh.setMatrixAt(index, debris.hidden);
          continue;
        }

        debris.velocity[offset + 1] -= 16 * delta;
        debris.position[offset] += debris.velocity[offset] * delta;
        debris.position[offset + 1] += debris.velocity[offset + 1] * delta;
        debris.position[offset + 2] += debris.velocity[offset + 2] * delta;

        if (debris.position[offset + 1] < 0.05 && debris.velocity[offset + 1] < 0) {
          debris.position[offset + 1] = 0.05;
          debris.velocity[offset + 1] *= -0.35;
          debris.velocity[offset] *= 0.6;
          debris.velocity[offset + 2] *= 0.6;
        }

        for (let axis = 0; axis < 3; axis += 1) {
          debris.rotation[offset + axis] += debris.spin[offset + axis] * delta;
        }

        const dummy = debris.dummy;
        dummy.position.set(
          debris.position[offset],
          debris.position[offset + 1],
          debris.position[offset + 2],
        );
        dummy.rotation.set(
          debris.rotation[offset],
          debris.rotation[offset + 1],
          debris.rotation[offset + 2],
        );
        dummy.scale.setScalar(debris.scale[index] * Math.min(1, debris.life[index] * 2.5));
        dummy.updateMatrix();
        mesh.setMatrixAt(index, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }

    // Beams, rings, and sweeps share a small pool of meshes.
    const group = transientGroup.current;
    if (!group) {
      return;
    }

    const now = performance.now();
    transients.list = transients.list.filter(
      (transient) => now - transient.start < transient.duration,
    );

    while (transients.meshes.length < transients.list.length) {
      const transientMesh = new Mesh();
      transients.meshes.push(transientMesh);
      group.add(transientMesh);
    }

    transients.meshes.forEach((transientMesh, index) => {
      const transient = transients.list[index];
      transientMesh.visible = Boolean(transient);

      if (!transient) {
        return;
      }

      const t = (now - transient.start) / transient.duration;
      const kind = transient.kind;

      if (transientMesh.userData.kind !== kind) {
        // Each pooled mesh keeps one material per kind instead of reallocating.
        const cache = (transientMesh.userData.materials ??= {}) as Record<
          Transient["kind"],
          ShaderMaterial | MeshBasicMaterial | undefined
        >;
        cache[kind] ??=
          kind === "beam"
            ? transients.beamMaterial()
            : new MeshBasicMaterial({
                transparent: true,
                depthWrite: false,
                blending: AdditiveBlending,
                side: DoubleSide,
                map: kind === "sweep" ? getSoftDotTexture() : null,
                toneMapped: false,
              });
        transientMesh.userData.kind = kind;
        transientMesh.geometry = transientGeometries[kind];
        transientMesh.material = cache[kind]!;
      }

      if (kind === "beam") {
        const material = transientMesh.material as ShaderMaterial;
        material.uniforms.uColor.value.copy(transient.color);
        material.uniforms.uOpacity.value = Math.sin(Math.min(1, t * 3) * Math.PI * 0.5) * (1 - t) * 0.9;
        const width = 0.55 + t * 0.4;
        transientMesh.position.copy(transient.from);
        transientMesh.position.y += transient.size / 2;
        transientMesh.scale.set(width, transient.size, width);
        transientMesh.rotation.set(0, 0, 0);
      } else if (kind === "ring") {
        const material = transientMesh.material as MeshBasicMaterial;
        material.color.copy(transient.color).multiplyScalar(1.6);
        material.opacity = (1 - t) ** 1.5;
        const scale = 0.3 + transient.size * (1 - (1 - t) ** 3);
        transientMesh.position.copy(transient.from);
        transientMesh.rotation.set(-Math.PI / 2, 0, 0);
        transientMesh.scale.set(scale, scale, scale);
      } else {
        const material = transientMesh.material as MeshBasicMaterial;
        material.color.copy(transient.color).multiplyScalar(2);
        const eased = 1 - (1 - t) ** 2;
        material.opacity = Math.sin(t * Math.PI);
        transientMesh.position.lerpVectors(transient.from, transient.to, eased);
        const direction = transient.to.clone().sub(transient.from);
        transientMesh.rotation.set(-Math.PI / 2, 0, -Math.atan2(direction.z, direction.x));
        transientMesh.scale.set(1.8, 1.25, 1);
      }
    });
  });

  return (
    <>
      <points
        ref={pointsRef}
        geometry={sparks.geometry}
        material={sparks.material}
        frustumCulled={false}
      />
      <instancedMesh
        ref={debrisRef}
        args={[undefined, undefined, MAX_DEBRIS]}
        castShadow
        frustumCulled={false}
      >
        <boxGeometry args={[1, 0.7, 1]} />
        <meshStandardMaterial roughness={0.7} />
      </instancedMesh>
      <group ref={transientGroup} />
    </>
  );
}

const transientGeometries = (() => {
  const beam = new BufferGeometry();
  // Open cylinder so the light column reads from any angle.
  const segments = 20;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index <= segments; index += 1) {
    const angle = (index / segments) * Math.PI * 2;
    const x = Math.cos(angle) * 0.5;
    const z = Math.sin(angle) * 0.5;
    positions.push(x, -0.5, z, x, 0.5, z);
    uvs.push(index / segments, 0, index / segments, 1);
    if (index < segments) {
      const base = index * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  }
  beam.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  beam.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  beam.setIndex(indices);

  const ringGeometry = (() => {
    const geometry = new BufferGeometry();
    const ringPositions: number[] = [];
    const ringIndices: number[] = [];
    const steps = 48;
    for (let index = 0; index <= steps; index += 1) {
      const angle = (index / steps) * Math.PI * 2;
      ringPositions.push(Math.cos(angle) * 0.42, Math.sin(angle) * 0.42, 0);
      ringPositions.push(Math.cos(angle) * 0.5, Math.sin(angle) * 0.5, 0);
      if (index < steps) {
        const base = index * 2;
        ringIndices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
      }
    }
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(ringPositions), 3));
    geometry.setIndex(ringIndices);
    return geometry;
  })();

  const sweep = new BufferGeometry();
  sweep.setAttribute(
    "position",
    new BufferAttribute(
      new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]),
      3,
    ),
  );
  sweep.setAttribute("uv", new BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 1]), 2));
  sweep.setIndex([0, 1, 2, 0, 2, 3]);

  return { beam, ring: ringGeometry, sweep } as const;
})();
