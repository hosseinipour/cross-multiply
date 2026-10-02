# Cross Multiply

Cross Multiply is a multiply-first number puzzle played on floating 3D islands. Each board is a grid of stone tiles with a target pillar at the head of every row and column; select the tiles whose numbers multiply to each pillar's product and crumble the rest.

It is built with React, TypeScript, three.js (via React Three Fiber), Vite, and Tailwind CSS. Sessions are quick and focused: generated levels, five worlds of escalating difficulty, hints, hearts, missions, unlockable modifiers, local progress persistence, day and night skies, and offline-ready PWA support.

## Features

- A real-time 3D board: tiles drop in, rise into glowing crystals when selected, and crumble into debris when erased
- Five worlds, one per difficulty, each with its own sky, lighting, ambient particles, and generative soundtrack: Meadow Isle, Sunstone Dunes, Glacier Spire, Ember Caldera, and the Astral Void
- Combo streaks that climb the world's musical scale and spin up the board emblem
- Light beams, line sweeps, fireworks, and camera moves for line clears, mistakes, and wins
- Fully synthesized sound effects and music (Web Audio, no audio files), with separate toggles
- Generated puzzles with a unique solution check
- Five difficulty tracks: Easy, Medium, Hard, Expert, and Mythic
- Progressive modifiers such as fogged targets, locked cells, sealed cells, tool locks, commit lines, cross-blind boards, and factor ciphers
- Missions for flawless runs, no-hint clears, and row-first play
- Explained hints that reveal a logically deducible cell and say why
- Matched lines clear their leftover cells automatically
- Solve timer with a personal best per level
- Hint stock, heart limits, retry/reroll flow, and level progression
- Local save state with `localStorage`, including the in-progress board
- Installable PWA with auto-updating service worker assets
- Responsive touch-friendly HUD that reframes the camera around it on any screen size
- Keyboard and screen-reader play through an accessible grid that drives a 3D cursor
- Adapts to slower devices by lowering resolution and post-processing, and respects reduced motion

## Tech Stack

- [React](https://react.dev/)
- [three.js](https://threejs.org/) with [React Three Fiber](https://r3f.docs.pmnd.rs/), [drei](https://drei.docs.pmnd.rs/), and [postprocessing](https://github.com/pmndrs/postprocessing)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vite.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Vitest](https://vitest.dev/)
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app/)

## Getting Started

### Prerequisites

- Node.js 20 or newer
- pnpm

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Vite will print a local URL, usually `http://localhost:5173`.

### Build

```bash
pnpm build
```

The production build is written to `dist/`.

### Preview Production Build

```bash
pnpm preview
```

### Test

```bash
pnpm test
```

### Lint

```bash
pnpm lint
```

## Project Structure

```text
src/
  App.tsx                    Wires the game hook to the 3D scene and the HUD
  appState.ts                Persisted progress, session state, unlocks
  game.ts                    Puzzle generation, validation, and rules
  progression.ts             Difficulty bands, modifiers, and missions
  cellState.ts               Why a cell is blocked, shared by scene, HUD, and a11y
  useCrossMultiplyGame.ts    Main game state hook
  useGameFx.ts               Turns state changes into one-shot effects and sounds
  scene/                     three.js scene: board, tiles, pillars, worlds, effects, camera
  hud/                       DOM overlay: top bar, tools, dialogs, menus, accessible grid
  audio/                     Synthesized sound effects and generative music
  components/                Small shared UI helpers
public/                      PWA icons and static assets
```

## Game Rules

Each board is a grid of numbered tiles. The pillar at the head of each row and column shows the product the selected tiles on that line must make. Use Select for tiles that belong in the product and Erase for tiles that do not. A puzzle is solved when every tile is correctly marked.

Once you start a line, its pillar's ring fills and a `×N` readout shows the factor it still needs. When a visible target is met, the rest of that line crumbles away for you.

### Controls

| Action | Mouse / touch | Keyboard |
| --- | --- | --- |
| Mark with the current tool | Click / tap a tile | Enter or Space |
| Mark with the other tool | Right-click / press and hold | X |
| Switch tool | Tool buttons | S (Select), E (Erase) |
| Use a hint | Lightbulb button | H |
| Move the cursor | | Arrow keys |
| Change world | Tap the world badge | |

Higher difficulties add constraints that change how information is revealed or how the player can move through the board. The generator checks candidate boards so puzzle targets resolve to a single solution.

## Contributing

Contributions are welcome. For a smooth pull request:

1. Open an issue or discussion for larger gameplay or design changes.
2. Keep changes focused and consistent with the existing React/TypeScript style.
3. Run `pnpm test`, `pnpm lint`, and `pnpm build` before submitting.
4. Include screenshots or a short recording for visible UI changes.

## License

Cross Multiply is open source under the [MIT License](LICENSE).
