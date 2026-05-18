# Cross Multiply

Cross Multiply is a multiply-first number puzzle game built with React, TypeScript, Vite, and Tailwind CSS. It generates compact logic boards where each row and column has a product target, and the player marks the cells that multiply to those targets.

The game is designed for quick, focused sessions: generated levels, escalating difficulty, hints, hearts, missions, unlockable modifiers, local progress persistence, light/dark themes, and offline-ready PWA support.

## Features

- Generated puzzles with a unique solution check
- Five difficulty tracks: Easy, Medium, Hard, Expert, and Mythic
- Progressive modifiers such as fogged targets, locked cells, sealed cells, tool locks, commit lines, cross-blind boards, and factor ciphers
- Missions for flawless runs, no-hint clears, and row-first play
- Hint stock, heart limits, retry/reroll flow, and level progression
- Local save state with `localStorage`
- Installable PWA with auto-updating service worker assets
- Responsive touch-friendly interface with light and dark themes

## Tech Stack

- [React](https://react.dev/)
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
  App.tsx                    Main application shell
  appState.ts                Persisted progress, session state, unlocks
  game.ts                    Puzzle generation, validation, and rules
  progression.ts             Difficulty bands, modifiers, and missions
  useCrossMultiplyGame.ts    Main game state hook
  components/                UI components for board, controls, dialogs, etc.
public/                      PWA icons and static assets
```

## Game Rules

Each puzzle board contains numbers in a grid. Row and column targets show the product the selected cells on that line must make. Use Select for cells that belong in the product and Erase for cells that do not. A puzzle is solved when every cell is correctly marked.

Higher difficulties add constraints that change how information is revealed or how the player can move through the board. The generator checks candidate boards so puzzle targets resolve to a single solution.

## Contributing

Contributions are welcome. For a smooth pull request:

1. Open an issue or discussion for larger gameplay or design changes.
2. Keep changes focused and consistent with the existing React/TypeScript style.
3. Run `pnpm test`, `pnpm lint`, and `pnpm build` before submitting.
4. Include screenshots or a short recording for visible UI changes.

## License

Cross Multiply is open source under the [MIT License](LICENSE).
