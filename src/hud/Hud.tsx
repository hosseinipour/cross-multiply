import { useEffect, useRef, useState } from "react";
import type { ProgressState, SessionState, ThemeMode, LevelResult } from "../appState";
import { getCorrectMarkCount, type DifficultyId, type ToolMode } from "../game";
import type { ModifierId } from "../progression";
import type { CellRef } from "../scene/Board";
import type { StageRect } from "../scene/layout";
import type { WorldTheme } from "../scene/worlds";
import type { Feedback } from "../useCrossMultiplyGame";
import { AccessibleGrid } from "./AccessibleGrid";
import { LoseDialog, UnlockDialog, WinDialog } from "./Dialogs";
import { MenuSheet } from "./MenuSheet";
import { FirstRunCoach, LevelBanner, RuleCard, Toast, type CoachStage } from "./Overlays";
import { ControlsList, MissionList, ProgressSummary, RuleList } from "./Panels";
import { StatusBar } from "./StatusBar";
import { ToolDock } from "./ToolDock";
import { TopBar } from "./TopBar";
import { glass } from "./ui";
import { WorldSelect } from "./WorldSelect";

/** Phones held sideways; mirrors the `short-land` variant in index.css. */
const SHORT_LANDSCAPE_QUERY =
  "(orientation: landscape) and (max-height: 540px) and (max-width: 1023px)";

const TEACHING_MODIFIERS: ModifierId[] = [
  "deepFog",
  "crossBlind",
  "commitLine",
  "toolLock",
  "sealedCells",
  "spotlightLine",
  "hintGate",
  "quietProgress",
  "noEcho",
  "cloakedCells",
  "factorCipher",
];

export type HudProps = {
  world: WorldTheme;
  session: SessionState;
  progress: ProgressState;
  difficulty: DifficultyId;
  currentResult: LevelResult | null;
  hintStock: number;
  hintGateUnlocked: boolean;
  feedback: Feedback | null;
  isPending: boolean;
  streak: number;
  theme: ThemeMode;
  onboardingDismissed: boolean;
  dismissedModifierTips: Partial<Record<ModifierId, boolean>>;
  unlockDialogOpen: boolean;
  onStageChange: (rect: StageRect) => void;
  onFocusCell: (cell: CellRef | null) => void;
  onPressCell: (row: number, col: number, alternate: boolean) => void;
  onModeChange: (mode: ToolMode) => void;
  onHint: () => void;
  onChangeDifficulty: (difficulty: DifficultyId) => void;
  onToggleTheme: () => void;
  onReroll: () => void;
  onRetry: () => void;
  onNext: () => void;
  onDismissModifierTip: (id: ModifierId) => void;
  onDismissOnboarding: () => void;
  onCloseUnlock: () => void;
};

export function Hud(props: HudProps) {
  const { world, session, progress, difficulty } = props;
  const { puzzle } = session;
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [worldsOpen, setWorldsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const { onStageChange } = props;
  const playing = session.status === "playing";

  // Frame the board between the measured top and bottom HUD clusters, so a
  // guide card makes the camera re-frame instead of covering tiles. Toasts sit
  // outside both clusters and never move the board.
  useEffect(() => {
    const top = topRef.current;
    const bottom = bottomRef.current;
    if (!top || !bottom) {
      return;
    }

    const sideways = window.matchMedia(SHORT_LANDSCAPE_QUERY);
    const report = () => {
      const width = window.innerWidth;

      if (sideways.matches) {
        // Rails on both sides: the board gets the full height between them.
        const x = top.getBoundingClientRect().right + 8;
        const end = bottom.getBoundingClientRect().left - 8;
        onStageChange({ x, y: 8, width: Math.max(120, end - x), height: window.innerHeight - 16 });
        return;
      }

      const side = width >= 1024 ? 336 : width >= 640 ? 24 : 4;
      const y = top.getBoundingClientRect().bottom + 6;
      const end = bottom.getBoundingClientRect().top - 6;
      onStageChange({ x: side, y, width: width - side * 2, height: Math.max(120, end - y) });
    };
    report();
    const observer = new ResizeObserver(report);
    observer.observe(top);
    observer.observe(bottom);
    window.addEventListener("resize", report);
    sideways.addEventListener("change", report);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", report);
      sideways.removeEventListener("change", report);
    };
  }, [onStageChange]);

  const teaching = puzzle.modifiers.filter(
    (modifier) =>
      TEACHING_MODIFIERS.includes(modifier.id) && !props.dismissedModifierTips[modifier.id],
  );
  const correctMarks = getCorrectMarkCount(puzzle, session.marks);
  const showCoach =
    !props.onboardingDismissed &&
    difficulty === "easy" &&
    puzzle.level === 1 &&
    progress.easy.clearedLevels === 0 &&
    playing;
  const coachStage: CoachStage =
    correctMarks === 0 ? "firstMark" : correctMarks < 3 ? "firstLine" : "rhythm";

  const guide = showCoach ? (
    <FirstRunCoach stage={coachStage} onDismiss={props.onDismissOnboarding} />
  ) : playing && teaching.length > 0 ? (
    <RuleCard
      modifier={teaching[0]}
      remaining={teaching.length}
      onDismiss={() => props.onDismissModifierTip(teaching[0].id)}
    />
  ) : null;

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-10 flex flex-col">
        <div
          ref={topRef}
          className="short-land:fixed short-land:left-[max(0.75rem,env(safe-area-inset-left))] short-land:top-3 short-land:w-64"
        >
          <TopBar
            world={world}
            puzzle={puzzle}
            currentResult={props.currentResult}
            hintStock={props.hintStock}
            hintGateUnlocked={props.hintGateUnlocked}
            canHint={playing && props.hintStock > 0 && props.hintGateUnlocked}
            onOpenWorlds={() => setWorldsOpen(true)}
            onOpenMenu={() => setMenuOpen(true)}
            onHint={props.onHint}
          />
          <StatusBar session={session} />
          <div className="mt-2 hidden short-land:block">{guide}</div>
        </div>
        <div className="mt-2">
          <Toast feedback={playing ? props.feedback : null} pending={props.isPending} />
        </div>

        <div className="flex-1" />

        <div
          ref={bottomRef}
          className="short-land:fixed short-land:bottom-3 short-land:right-[max(0.75rem,env(safe-area-inset-right))]"
        >
          <div className="flex flex-col items-center gap-2 px-3 lg:hidden short-land:hidden">{guide}</div>
          <ToolDock
            mode={session.mode}
            toolLocked={session.toolLocked}
            streak={props.streak}
            playing={playing}
            onModeChange={props.onModeChange}
          />
        </div>
      </div>

      <aside className={`pointer-events-auto fixed bottom-6 left-5 top-28 z-10 hidden w-80 flex-col gap-5 overflow-y-auto rounded-[1.6rem] p-5 lg:flex ${glass}`}>
        {guide}
        <MissionList session={session} progress={progress} difficulty={difficulty} />
        <RuleList session={session} />
      </aside>
      <aside className={`pointer-events-auto fixed bottom-6 right-5 top-28 z-10 hidden w-80 flex-col gap-5 overflow-y-auto rounded-[1.6rem] p-5 lg:flex ${glass}`}>
        <ProgressSummary progress={progress} difficulty={difficulty} />
        <ControlsList />
      </aside>

      <LevelBanner key={puzzle.id} puzzle={puzzle} world={world} />

      <AccessibleGrid session={session} onPress={props.onPressCell} onFocusCell={props.onFocusCell} />

      <WinDialog
        session={session}
        progress={progress}
        difficulty={difficulty}
        hintStock={props.hintStock}
        onNext={props.onNext}
        onReplay={props.onRetry}
      />
      <LoseDialog session={session} onRetry={props.onRetry} onReroll={props.onReroll} />
      {props.unlockDialogOpen && <UnlockDialog onClose={props.onCloseUnlock} />}
      {worldsOpen && (
        <WorldSelect
          current={difficulty}
          progress={progress}
          onChoose={props.onChangeDifficulty}
          onClose={() => setWorldsOpen(false)}
        />
      )}
      {menuOpen && (
        <MenuSheet
          session={session}
          progress={progress}
          difficulty={difficulty}
          theme={props.theme}
          onToggleTheme={props.onToggleTheme}
          onReroll={props.onReroll}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </>
  );
}
