import type { DifficultyId } from "../game";

export type AmbientKind = "pollen" | "sand" | "snow" | "embers" | "stardust";

export type SkyPalette = {
  top: string;
  horizon: string;
  bottom: string;
  sun: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
};

export type WorldTheme = {
  id: DifficultyId;
  name: string;
  tagline: string;
  day: SkyPalette;
  night: SkyPalette;
  /** Board slab top and its rocky underside. */
  slab: string;
  slabSide: string;
  rock: string;
  /** Idle tile body and the number printed on it. */
  tile: string;
  ink: string;
  /** Selected tiles turn into glowing crystal. */
  crystal: string;
  crystalInk: string;
  erased: string;
  pillar: string;
  pillarTop: string;
  pillarInk: string;
  /** Secondary sparkle colour for bursts. */
  spark: string;
  ambient: { kind: AmbientKind; color: string; count: number; size: number };
  /** Soft masses drifting far below the island: clouds, haze, lava glow, nebula. */
  below: { colors: string[]; opacity: number; glow: boolean };
  /** Root note (MIDI) and scale steps for the generative soundtrack. */
  music: { root: number; scale: number[]; chords: number[][]; tempo: number };
  /** CSS accent for the HUD. */
  accent: string;
  accentInk: string;
};

const PENTATONIC = [0, 2, 4, 7, 9];
const MINOR_PENTATONIC = [0, 3, 5, 7, 10];

export const WORLDS: Record<DifficultyId, WorldTheme> = {
  easy: {
    id: "easy",
    name: "Meadow Isle",
    tagline: "Warm stone, soft grass, first sparks.",
    day: {
      top: "#5fa8f0",
      horizon: "#ffe2bd",
      bottom: "#8ec8ea",
      sun: "#fff1d6",
      sunIntensity: 2.4,
      hemiSky: "#cfe8ff",
      hemiGround: "#6f9a5a",
      hemiIntensity: 1.1,
    },
    night: {
      top: "#081230",
      horizon: "#2e3f78",
      bottom: "#0e1c3a",
      sun: "#9db8ff",
      sunIntensity: 1.1,
      hemiSky: "#3b4f8f",
      hemiGround: "#1d3324",
      hemiIntensity: 0.75,
    },
    slab: "#74b86a",
    slabSide: "#8a6648",
    rock: "#9a8a76",
    tile: "#f4ead6",
    ink: "#3b352c",
    crystal: "#2fe0aa",
    crystalInk: "#073d2e",
    erased: "#8e8676",
    pillar: "#d9c9a8",
    pillarTop: "#fff6e2",
    pillarInk: "#40362a",
    spark: "#fff3a0",
    ambient: { kind: "pollen", color: "#fff4a8", count: 140, size: 7 },
    below: { colors: ["#ffffff", "#f3f7ff"], opacity: 0.9, glow: false },
    music: {
      root: 60,
      scale: PENTATONIC,
      chords: [
        [0, 4, 7, 11],
        [9, 12, 16, 19],
        [5, 9, 12, 16],
        [7, 11, 14, 17],
      ],
      tempo: 84,
    },
    accent: "#2fd6a2",
    accentInk: "#062d22",
  },
  medium: {
    id: "medium",
    name: "Sunstone Dunes",
    tagline: "Sandstone ruins under a long sunset.",
    day: {
      top: "#f2865e",
      horizon: "#ffd796",
      bottom: "#e9b071",
      sun: "#ffd7a0",
      sunIntensity: 2.6,
      hemiSky: "#ffd2a8",
      hemiGround: "#a86a3a",
      hemiIntensity: 1.05,
    },
    night: {
      top: "#170d33",
      horizon: "#6a3658",
      bottom: "#2a1626",
      sun: "#ffb58a",
      sunIntensity: 1.1,
      hemiSky: "#6b4a8a",
      hemiGround: "#3a2218",
      hemiIntensity: 0.8,
    },
    slab: "#d9a35f",
    slabSide: "#9c6537",
    rock: "#c48a52",
    tile: "#f6dcae",
    ink: "#5a3518",
    crystal: "#ffb21f",
    crystalInk: "#4a2600",
    erased: "#a8865e",
    pillar: "#c98d4f",
    pillarTop: "#ffe6bd",
    pillarInk: "#4d2a0e",
    spark: "#ffe08a",
    ambient: { kind: "sand", color: "#ffd9a0", count: 220, size: 4.5 },
    below: { colors: ["#ffd9ae", "#f6c38c"], opacity: 0.55, glow: false },
    music: {
      root: 57,
      scale: [0, 1, 4, 5, 7, 8, 10],
      chords: [
        [0, 7, 12, 15],
        [-2, 5, 10, 13],
        [-4, 3, 8, 12],
        [-5, 2, 7, 11],
      ],
      tempo: 76,
    },
    accent: "#ffb21f",
    accentInk: "#3b1e00",
  },
  hard: {
    id: "hard",
    name: "Glacier Spire",
    tagline: "Frosted glass and falling snow.",
    day: {
      top: "#7fbef7",
      horizon: "#eaf6ff",
      bottom: "#5f97c9",
      sun: "#f2f8ff",
      sunIntensity: 2.5,
      hemiSky: "#e4f2ff",
      hemiGround: "#7d9cb8",
      hemiIntensity: 1.2,
    },
    night: {
      top: "#040b22",
      horizon: "#1d3a68",
      bottom: "#0b1a33",
      sun: "#b8d6ff",
      sunIntensity: 1.15,
      hemiSky: "#3a5e9a",
      hemiGround: "#1a2a40",
      hemiIntensity: 0.85,
    },
    slab: "#bfe0f5",
    slabSide: "#55809f",
    rock: "#a9c2d8",
    tile: "#f2f9ff",
    ink: "#1d3a5c",
    crystal: "#3fd0ff",
    crystalInk: "#03283d",
    erased: "#8ea6bd",
    pillar: "#b9d6ec",
    pillarTop: "#ffffff",
    pillarInk: "#18324f",
    spark: "#d8f6ff",
    ambient: { kind: "snow", color: "#ffffff", count: 320, size: 6 },
    below: { colors: ["#ffffff", "#dcefff"], opacity: 0.85, glow: false },
    music: {
      root: 62,
      scale: [0, 2, 3, 7, 9],
      chords: [
        [0, 7, 14, 15],
        [-4, 3, 10, 14],
        [-7, 0, 7, 10],
        [-2, 5, 12, 14],
      ],
      tempo: 70,
    },
    accent: "#3fd0ff",
    accentInk: "#02263a",
  },
  expert: {
    id: "expert",
    name: "Ember Caldera",
    tagline: "Basalt slabs over a sleeping volcano.",
    day: {
      top: "#3a1410",
      horizon: "#d4562a",
      bottom: "#4a1a0c",
      sun: "#ffb27a",
      sunIntensity: 2.2,
      hemiSky: "#ff9a6a",
      hemiGround: "#3a120a",
      hemiIntensity: 0.9,
    },
    night: {
      top: "#0e0404",
      horizon: "#7a2410",
      bottom: "#1a0704",
      sun: "#ff8a52",
      sunIntensity: 1.4,
      hemiSky: "#a0442a",
      hemiGround: "#200805",
      hemiIntensity: 0.7,
    },
    slab: "#3d3431",
    slabSide: "#241d1b",
    rock: "#2e2523",
    tile: "#5a4f4a",
    ink: "#ffe2c6",
    crystal: "#ff6420",
    crystalInk: "#2a0800",
    erased: "#2c2421",
    pillar: "#4a3f3b",
    pillarTop: "#6b5d57",
    pillarInk: "#ffe8d0",
    spark: "#ffc061",
    ambient: { kind: "embers", color: "#ff8a3a", count: 160, size: 6 },
    below: { colors: ["#ff5a1a", "#ff8a2a", "#b3240c"], opacity: 0.55, glow: true },
    music: {
      root: 50,
      scale: MINOR_PENTATONIC,
      chords: [
        [0, 7, 12, 15],
        [-4, 3, 8, 12],
        [-2, 5, 10, 14],
        [-7, 0, 5, 8],
      ],
      tempo: 66,
    },
    accent: "#ff7a2e",
    accentInk: "#2a0900",
  },
  mythic: {
    id: "mythic",
    name: "Astral Void",
    tagline: "Obsidian tiles adrift among the stars.",
    day: {
      top: "#0a0624",
      horizon: "#47237d",
      bottom: "#120830",
      sun: "#d7c2ff",
      sunIntensity: 1.9,
      hemiSky: "#8f6ad8",
      hemiGround: "#1a0d33",
      hemiIntensity: 0.95,
    },
    night: {
      top: "#020108",
      horizon: "#261047",
      bottom: "#07021a",
      sun: "#b49aff",
      sunIntensity: 1.4,
      hemiSky: "#5a3f9a",
      hemiGround: "#0b0520",
      hemiIntensity: 0.8,
    },
    slab: "#1f1836",
    slabSide: "#120d22",
    rock: "#2a2148",
    tile: "#2e2650",
    ink: "#efe8ff",
    crystal: "#c25cff",
    crystalInk: "#1d0033",
    erased: "#17122a",
    pillar: "#2a2148",
    pillarTop: "#3e3270",
    pillarInk: "#f3ecff",
    spark: "#8ff3ff",
    ambient: { kind: "stardust", color: "#cbb8ff", count: 260, size: 5 },
    below: { colors: ["#8a5cff", "#3fc8ff", "#d05cff"], opacity: 0.4, glow: true },
    music: {
      root: 55,
      scale: [0, 2, 4, 6, 7, 9, 11],
      chords: [
        [0, 7, 11, 14],
        [2, 9, 14, 18],
        [-3, 4, 11, 14],
        [-5, 2, 9, 12],
      ],
      tempo: 60,
    },
    accent: "#c25cff",
    accentInk: "#1a002e",
  },
};
