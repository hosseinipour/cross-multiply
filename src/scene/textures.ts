import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import type { DifficultyId } from "../game";
import fredokaBold from "@fontsource/fredoka/files/fredoka-latin-700-normal.woff?url";

/** Bundled locally so 3D text renders offline, same as the HUD font. */
export const FONT_BOLD = fredokaBold;

let softDot: CanvasTexture | null = null;
type BoardSurfaceKind = "pollen" | "sand" | "snow";
const surfaces = new Map<BoardSurfaceKind, CanvasTexture>();

const BOARD_SURFACES = {
  easy: { kind: "pollen", roughness: 0.58, metalness: 0.02, clearcoat: 0.18, bump: 0.035 },
  medium: { kind: "sand", roughness: 0.82, metalness: 0.03, clearcoat: 0.05, bump: 0.065 },
  hard: { kind: "snow", roughness: 0.22, metalness: 0.12, clearcoat: 0.95, bump: 0.018 },
} as const;

export function getBoardSurface(difficulty: DifficultyId) {
  return difficulty === "easy" || difficulty === "medium" || difficulty === "hard"
    ? BOARD_SURFACES[difficulty]
    : null;
}

/** Small, repeatable height maps: no network assets, including offline play. */
export function getSurfaceTexture(kind: BoardSurfaceKind) {
  const cached = surfaces.get(kind);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d")!;
  const pixels = context.createImageData(128, 128);
  let seed = 41;
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      seed = (seed * 16807) % 2147483647;
      const grain = seed / 2147483647;
      const wave = Math.sin((x * Math.PI) / 16 + Math.sin((y * Math.PI) / 32) * 2);
      const vein = Math.sin(((x + y) * Math.PI) / 32 + wave * 2);
      const height =
        kind === "sand"
          ? 125 + wave * 27 + grain * 38
          : kind === "snow"
            ? 160 + vein * 24 + grain * 12
            : 95 + grain * 100;
      const offset = (y * 128 + x) * 4;
      pixels.data[offset] = pixels.data[offset + 1] = pixels.data[offset + 2] = height;
      pixels.data[offset + 3] = 255;
    }
  }
  context.putImageData(pixels, 0, 0);
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  surfaces.set(kind, texture);
  return texture;
}

/** A soft radial falloff used for sparks, fog wisps, and glows. */
export function getSoftDotTexture() {
  if (softDot) {
    return softDot;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d")!;
  const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.75)");
  gradient.addColorStop(0.6, "rgba(255,255,255,0.18)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 64, 64);
  softDot = new CanvasTexture(canvas);
  softDot.colorSpace = SRGBColorSpace;
  return softDot;
}
