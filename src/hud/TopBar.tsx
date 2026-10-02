import { ChevronDown, Lightbulb, Lock, Menu, Star, Volume2, VolumeX } from "lucide-react";
import type { LevelResult } from "../appState";
import { sound } from "../audio/sound";
import { useSoundSettings } from "../audio/useSoundSettings";
import { HapticButton } from "../components/HapticButton";
import type { Puzzle } from "../game";
import type { WorldTheme } from "../scene/worlds";
import { focusRing, glass, iconButton } from "./ui";

export function TopBar({
  world,
  puzzle,
  currentResult,
  hintStock,
  hintGateUnlocked,
  canHint,
  onOpenWorlds,
  onOpenMenu,
  onHint,
}: {
  world: WorldTheme;
  puzzle: Puzzle;
  currentResult: LevelResult | null;
  hintStock: number;
  hintGateUnlocked: boolean;
  canHint: boolean;
  onOpenWorlds: () => void;
  onOpenMenu: () => void;
  onHint: () => void;
}) {
  const settings = useSoundSettings();
  const muted = !settings.sfx && !settings.music;

  return (
    <header className="pointer-events-auto flex items-start justify-between gap-2 px-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5 sm:pt-5">
      <HapticButton
        type="button"
        onClick={onOpenWorlds}
        className={`group flex min-w-0 items-center gap-3 rounded-[1.4rem] py-2 pl-2 pr-3 text-left transition hover:bg-white/12 sm:pr-4 ${glass} ${focusRing}`}
        aria-label={`${world.name}, level ${puzzle.level}. Choose a world`}
      >
        <span
          aria-hidden="true"
          className="grid size-11 shrink-0 place-items-center rounded-2xl text-lg font-bold shadow-[inset_0_-3px_0_rgb(0_0_0/0.2)] sm:size-12 sm:text-xl"
          style={{
            background: `linear-gradient(160deg, ${world.day.top}, ${world.day.horizon})`,
            color: world.accentInk,
          }}
        >
          {puzzle.level}
        </span>
        <span className="min-w-0">
          <span className="flex items-center gap-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/60">
            <span className="truncate">{world.name}</span>
            <ChevronDown className="size-3.5 shrink-0 transition group-hover:translate-y-0.5" />
          </span>
          <span className="mt-0.5 flex items-center gap-2">
            <span className="text-lg font-bold leading-none sm:text-xl">Level {puzzle.level}</span>
            <span className="hidden items-center gap-0.5 sm:flex" aria-label={`Best: ${currentResult?.stars ?? 0} of 3 stars`}>
              {Array.from({ length: 3 }, (_, index) => (
                <Star
                  key={index}
                  className={`size-3.5 ${
                    index < (currentResult?.stars ?? 0)
                      ? "fill-[#ffd75e] text-[#ffd75e]"
                      : "text-white/25"
                  }`}
                  strokeWidth={2}
                />
              ))}
            </span>
          </span>
          <span className="mt-1 block truncate text-xs text-white/55">{puzzle.bandLabel}</span>
        </span>
      </HapticButton>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <HapticButton
          type="button"
          onClick={onHint}
          disabled={!canHint}
          className={iconButton}
          aria-label={
            hintGateUnlocked
              ? `Use hint (H), ${hintStock} left`
              : `Hints unlock after ${puzzle.hintGate?.unlockAfterCorrectMarks ?? 0} correct marks`
          }
        >
          <Lightbulb className="size-5 text-[#ffd75e]" strokeWidth={2} />
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-[#ffd75e] px-1 py-0.5 text-[0.68rem] font-bold leading-none text-[#2a1d00]">
            {hintGateUnlocked ? hintStock : <Lock className="size-3" strokeWidth={2.4} />}
          </span>
        </HapticButton>
        <HapticButton
          type="button"
          onClick={() => {
            sound.unlock();
            sound.update(muted ? { sfx: true, music: true } : { sfx: false, music: false });
          }}
          className={`${iconButton} hidden sm:grid`}
          aria-label={muted ? "Unmute sound" : "Mute sound"}
        >
          {muted ? <VolumeX className="size-5" strokeWidth={2} /> : <Volume2 className="size-5" strokeWidth={2} />}
        </HapticButton>
        <HapticButton type="button" onClick={onOpenMenu} className={iconButton} aria-label="Open menu">
          <Menu className="size-5" strokeWidth={2} />
        </HapticButton>
      </div>
    </header>
  );
}
