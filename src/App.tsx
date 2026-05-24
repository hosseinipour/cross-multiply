import { useEffect } from "react";
import { ActionToast } from "./components/ActionToast";
import { DifficultyRail } from "./components/DifficultyRail";
import { GameDialogs } from "./components/GameDialogs";
import { GameHeader } from "./components/GameHeader";
import { GameSidebar } from "./components/GameSidebar";
import { MobileToolDock } from "./components/MobileToolDock";
import { PuzzleBoard } from "./components/PuzzleBoard";
import { useCrossMultiplyGame } from "./useCrossMultiplyGame";

function App() {
  const game = useCrossMultiplyGame();

  // Pointer move handler for spotlight-slab mouse hover effects
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      const slab = target.closest(".spotlight-slab") as HTMLElement;
      if (slab) {
        const rect = slab.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        slab.style.setProperty("--mouse-x", `${x}px`);
        slab.style.setProperty("--mouse-y", `${y}px`);
      }
    };
    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  return (
    <div className="relative min-h-[100dvh] overflow-x-hidden bg-[var(--app-bg)] text-[var(--text-primary)] transition-colors duration-300">
      {/* Tactile Noise Overlay */}
      <div className="noise-overlay" />

      {/* Floating Animated Mesh Glows */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-[5%] top-[10%] h-[35vw] w-[35vw] rounded-full bg-[var(--glow-secondary)] opacity-35 blur-[90px] animate-[pulse_10s_infinite_alternate]" />
        <div className="absolute right-[10%] bottom-[15%] h-[40vw] w-[40vw] rounded-full bg-[var(--glow-primary)] opacity-45 blur-[110px] animate-[pulse_12s_infinite_alternate_2s]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[86rem] flex-col px-3 pb-24 pt-3 sm:px-6 sm:pb-28 sm:pt-6 lg:px-8">
        <div className="puzzle-surface relative flex flex-col gap-5 rounded-[2rem] border border-[var(--panel-border)] p-4 shadow-[0_24px_80px_var(--shadow-board)] backdrop-blur-md sm:gap-6 sm:p-6 lg:p-8">

          <GameHeader
            currentResult={game.currentResult}
            difficulty={game.difficulty}
            hintGateUnlocked={game.hintGateUnlocked}
            hintStock={game.hintStock}
            onChangeDifficulty={game.changeDifficulty}
            onReroll={game.rerollCurrentBoard}
            onToggleTheme={game.toggleTheme}
            onUseHint={game.useHint}
            progress={game.progress}
            puzzle={game.puzzle}
            sessionStatus={game.session.status}
            theme={game.theme}
          />

          <div className="mt-1 grid min-w-0 gap-5 sm:gap-6 grid-cols-1 lg:grid-cols-[1fr_21rem] xl:grid-cols-[1fr_24rem]">
            <div className="flex flex-col gap-4 sm:gap-6">
              <PuzzleBoard
                difficulty={game.difficulty}
                onCellPress={game.handleCellPress}
                onDismissOnboarding={game.dismissOnboarding}
                onboardingDismissed={game.onboardingDismissed}
                progress={game.progress}
                session={game.session}
              />

              <DifficultyRail
                className="flex sm:hidden"
                difficulty={game.difficulty}
                onChange={game.changeDifficulty}
                progress={game.progress}
              />
            </div>

            <div className="animate-spring-in">
              <GameSidebar
                difficulty={game.difficulty}
                dismissedModifierTips={game.dismissedModifierTips}
                onDismissModifierTip={game.dismissModifierTip}
                onModeChange={game.setMode}
                progress={game.progress}
                puzzle={game.puzzle}
                session={game.session}
              />
            </div>
          </div>
        </div>

        {game.session.status === "playing" && (
          <MobileToolDock
            mode={game.session.mode}
            onModeChange={game.setMode}
            toolLocked={game.session.toolLocked}
          />
        )}

        <ActionToast isPending={game.isPending} status={game.session.status} />

        <GameDialogs
          difficulty={game.difficulty}
          onCloseUnlock={game.closeUnlockDialog}
          onMoveNext={game.moveToNextLevel}
          onReroll={game.rerollLevel}
          onRetry={game.retryLevel}
          progress={game.progress}
          puzzle={game.puzzle}
          session={game.session}
          status={game.session.status}
          unlockDialogOpen={game.unlockDialogOpen}
        />
      </main>
    </div>
  );
}

export default App;
