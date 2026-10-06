import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { sound } from "./audio/sound";
import { Hud } from "./hud/Hud";
import type { CellRef } from "./scene/Board";
import { emitFx } from "./scene/fxBus";
import { GameScene } from "./scene/GameScene";
import type { StageRect } from "./scene/layout";
import { WORLDS } from "./scene/worlds";
import { useCrossMultiplyGame } from "./useCrossMultiplyGame";
import { useGameFx } from "./useGameFx";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (listener) => {
      const query = window.matchMedia(REDUCED_MOTION_QUERY);
      query.addEventListener("change", listener);
      return () => query.removeEventListener("change", listener);
    },
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

function App() {
  const game = useCrossMultiplyGame();
  const world = WORLDS[game.difficulty];
  const reducedMotion = usePrefersReducedMotion();
  const [hoverCell, setHoverCell] = useState<CellRef | null>(null);
  const [focusCell, setFocusCell] = useState<CellRef | null>(null);
  const [stage, setStage] = useState<StageRect | null>(null);

  useGameFx(game.session, game.runId, game.streak, world);

  useEffect(() => {
    // Browsers only start audio after a gesture; pause it with the tab.
    const unlock = () => sound.unlock();
    const handleVisibility = () => sound.setPaused(document.visibilityState !== "visible");
    // Touch pointerdown is not a user activation; iOS needs touchend/click.
    const gestures = ["pointerdown", "pointerup", "touchend", "click", "keydown"];
    gestures.forEach((name) => window.addEventListener(name, unlock));
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      gestures.forEach((name) => window.removeEventListener(name, unlock));
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--world-accent", world.accent);
    root.setProperty("--world-accent-ink", world.accentInk);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", game.theme === "dark" ? world.night.top : world.day.top);
  }, [game.theme, world]);

  const handleStageChange = useCallback((rect: StageRect) => {
    setStage((current) =>
      current &&
      current.x === rect.x &&
      current.y === rect.y &&
      current.width === rect.width &&
      current.height === rect.height
        ? current
        : rect,
    );
  }, []);

  const pressCell = (row: number, col: number, alternate: boolean) => {
    const mode = game.session.mode;
    const result = game.handleCellPress(
      row,
      col,
      alternate ? (mode === "select" ? "erase" : "select") : undefined,
    );

    if (result === "blocked") {
      emitFx({ type: "blocked", row, col });
    }
  };

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#0b0d1a] font-sans text-white select-none">
      <h1 className="sr-only">Cross Multiply</h1>
      <GameScene
        session={game.session}
        runId={game.runId}
        theme={world}
        themeMode={game.theme}
        mode={game.session.mode}
        hoverCell={hoverCell}
        focusCell={focusCell}
        streak={game.streak}
        stage={stage}
        reducedMotion={reducedMotion}
        onHoverCell={setHoverCell}
        onCellPress={pressCell}
      />
      <Hud
        world={world}
        session={game.session}
        progress={game.progress}
        difficulty={game.difficulty}
        currentResult={game.currentResult}
        hintStock={game.hintStock}
        hintGateUnlocked={game.hintGateUnlocked}
        feedback={game.feedback}
        isPending={game.isPending}
        streak={game.streak}
        theme={game.theme}
        onboardingDismissed={game.onboardingDismissed}
        dismissedModifierTips={game.dismissedModifierTips}
        unlockDialogOpen={game.unlockDialogOpen}
        onStageChange={handleStageChange}
        onFocusCell={setFocusCell}
        onPressCell={pressCell}
        onModeChange={game.setMode}
        onHint={game.requestHint}
        onChangeDifficulty={game.changeDifficulty}
        onToggleTheme={game.toggleTheme}
        onToggleSoundEffects={game.toggleSoundEffects}
        onReroll={game.rerollLevel}
        onRetry={game.retryLevel}
        onNext={game.moveToNextLevel}
        onDismissModifierTip={game.dismissModifierTip}
        onDismissOnboarding={game.dismissOnboarding}
        onCloseUnlock={game.closeUnlockDialog}
      />
    </main>
  );
}

export default App;
