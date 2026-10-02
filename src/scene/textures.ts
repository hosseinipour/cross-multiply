import { CanvasTexture, SRGBColorSpace } from "three";
import fredokaBold from "@fontsource/fredoka/files/fredoka-latin-700-normal.woff?url";

/** Bundled locally so 3D text renders offline, same as the HUD font. */
export const FONT_BOLD = fredokaBold;

let softDot: CanvasTexture | null = null;

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
