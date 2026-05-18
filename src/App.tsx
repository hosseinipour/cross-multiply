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

  return (
    <div className="min-h-screen overflow-x-hidden bg-[var(--app-bg)] text-[var(--text-primary)] transition-colors duration-300">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 opacity-25 [background-image:linear-gradient(90deg,color-mix(in_oklch,var(--border)_38%,transparent)_1px,transparent_1px),linear-gradient(180deg,color-mix(in_oklch,var(--border)_38%,transparent)_1px,transparent_1px)] [background-size:42px_42px] sm:opacity-35" />
        <div className="absolute left-[-12%] top-16 hidden h-16 w-[72rem] rotate-[-7deg] bg-[var(--glow-secondary)] opacity-45 sm:block" />
        <div className="absolute bottom-20 right-[-14rem] hidden h-14 w-[52rem] rotate-[-14deg] bg-[var(--glow-primary)] opacity-55 sm:block" />
      </div>

      <main className="relative mx-auto flex min-h-screen w-full max-w-[92rem] flex-col px-1.5 pb-24 pt-1.5 sm:px-5 sm:pb-28 sm:pt-5 lg:px-8 lg:py-5">
        <section className="mx-auto flex w-full max-w-none flex-col">
          <div className="min-w-0 flex-1">
            <div className="puzzle-surface min-h-[calc(100vh-0.75rem)] overflow-hidden rounded-[1.35rem] border border-[var(--panel-border)] p-2.5 shadow-[0_24px_80px_var(--shadow-board)] backdrop-blur sm:min-h-[calc(100vh-2.5rem)] sm:rounded-[2rem] sm:p-4 xl:p-6">
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

              <div className="mt-3 grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 sm:mt-5 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_19rem] xl:grid-cols-[minmax(0,1fr)_22rem]">
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
        </section>

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
