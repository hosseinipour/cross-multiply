import type { ReactNode } from "react";
import { CheckCircle2, Eraser, Flame, Lock } from "lucide-react";
import { sound } from "../audio/sound";
import { HapticButton } from "../components/HapticButton";
import type { ToolMode } from "../game";
import { focusRing, glass } from "./ui";

const COMBO_TITLES = ["", "", "Nice", "Sharp", "Hot", "Blazing", "On fire", "Unstoppable"];

function ComboMeter({ streak }: { streak: number }) {
  if (streak < 2) {
    return <div className="h-9" aria-hidden="true" />;
  }

  const heat = Math.min(1, streak / 10);
  const title = COMBO_TITLES[Math.min(streak, COMBO_TITLES.length - 1)];

  return (
    <div
      key={streak}
      className="flex h-9 animate-[comboPop_380ms_cubic-bezier(0.34,1.56,0.64,1)] items-center gap-2 rounded-full border border-white/15 bg-[oklch(17%_0.025_265/0.62)] px-4 font-bold text-white backdrop-blur-xl"
      style={{
        boxShadow: `0 0 ${12 + heat * 30}px color-mix(in oklch, var(--world-accent) ${30 + heat * 50}%, transparent)`,
      }}
      aria-live="off"
    >
      <Flame
        className="size-4"
        style={{ color: `color-mix(in oklch, #ffd75e, #ff5a2a ${heat * 100}%)` }}
        strokeWidth={2.4}
      />
      <span className="tabular-nums">×{streak}</span>
      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">{title}</span>
    </div>
  );
}

function ToolButton({
  active,
  disabled,
  icon,
  label,
  hotkey,
  onClick,
}: {
  active: boolean;
  disabled: boolean;
  icon: ReactNode;
  label: string;
  hotkey: string;
  onClick: () => void;
}) {
  return (
    <HapticButton
      type="button"
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
      className={`relative flex min-h-14 flex-1 items-center justify-center gap-2.5 rounded-[1.15rem] px-4 text-base font-bold transition duration-200 disabled:cursor-not-allowed sm:min-w-40 ${focusRing} ${
        active
          ? "bg-[var(--world-accent)] text-[var(--world-accent-ink)] shadow-[inset_0_-4px_0_rgb(0_0_0/0.22),0_8px_26px_color-mix(in_oklch,var(--world-accent)_45%,transparent)]"
          : "text-white/80 hover:bg-white/10 disabled:opacity-50"
      }`}
    >
      {disabled && !active ? <Lock className="size-5" strokeWidth={2.2} /> : icon}
      {label}
      <kbd className="hidden rounded-md border border-current/25 px-1.5 text-[0.65rem] font-semibold opacity-60 lg:inline">
        {hotkey}
      </kbd>
    </HapticButton>
  );
}

export function ToolDock({
  mode,
  toolLocked,
  streak,
  playing,
  onModeChange,
}: {
  mode: ToolMode;
  toolLocked: boolean;
  streak: number;
  playing: boolean;
  onModeChange: (mode: ToolMode) => void;
}) {
  const choose = (next: ToolMode) => {
    if (next !== mode && !toolLocked) {
      sound.play("toggle");
    }
    onModeChange(next);
  };

  return (
    <div className="pointer-events-none flex flex-col items-center gap-2 px-3 pb-[max(0.85rem,env(safe-area-inset-bottom))] sm:pb-5">
      <ComboMeter streak={streak} />
      {playing && (
        <div
          role="group"
          aria-label="Marking tool"
          className={`pointer-events-auto flex w-full max-w-md gap-1.5 rounded-[1.5rem] p-1.5 sm:w-auto ${glass}`}
        >
          <ToolButton
            active={mode === "select"}
            disabled={toolLocked && mode !== "select"}
            icon={<CheckCircle2 className="size-5" strokeWidth={2.2} />}
            label="Select"
            hotkey="S"
            onClick={() => choose("select")}
          />
          <ToolButton
            active={mode === "erase"}
            disabled={toolLocked && mode !== "erase"}
            icon={<Eraser className="size-5" strokeWidth={2.2} />}
            label="Erase"
            hotkey="E"
            onClick={() => choose("erase")}
          />
        </div>
      )}
    </div>
  );
}
