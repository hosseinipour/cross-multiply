import { useEffect, useState } from "react";
import { Info, Lightbulb, ShieldAlert, Sparkles, X } from "lucide-react";
import { HapticButton } from "../components/HapticButton";
import type { Puzzle, PuzzleModifier } from "../game";
import type { WorldTheme } from "../scene/worlds";
import type { Feedback } from "../useCrossMultiplyGame";
import { focusRing, glass } from "./ui";

const TOAST_TONES = {
  hint: { icon: Lightbulb, className: "border-[#ffd75e]/45", iconClass: "text-[#ffd75e]" },
  danger: { icon: ShieldAlert, className: "border-[#ff6b6b]/50", iconClass: "text-[#ff8a8a]" },
  info: { icon: Info, className: "border-white/20", iconClass: "text-[var(--world-accent)]" },
} as const;

export function Toast({ feedback, pending }: { feedback: Feedback | null; pending: boolean }) {
  const tone = feedback ? TOAST_TONES[feedback.tone] : null;
  const Icon = tone?.icon;

  return (
    <div className="pointer-events-none flex justify-center px-3" role="status" aria-live="polite">
      {feedback && tone && Icon ? (
        <div
          key={feedback.id}
          className={`flex max-w-md animate-[toastIn_320ms_cubic-bezier(0.34,1.56,0.64,1)] items-start gap-2.5 rounded-2xl px-4 py-3 text-sm leading-snug ${glass} ${tone.className}`}
        >
          <Icon className={`mt-0.5 size-4 shrink-0 ${tone.iconClass}`} strokeWidth={2.2} />
          <span>{feedback.message}</span>
        </div>
      ) : pending ? (
        <div className={`rounded-full px-4 py-2 text-sm text-white/80 ${glass}`}>Shaping a new board…</div>
      ) : null}
    </div>
  );
}

/** The cinematic title card that plays as each board drops in. */
export function LevelBanner({ puzzle, world }: { puzzle: Puzzle; world: WorldTheme }) {
  const [visibleFor, setVisibleFor] = useState<string | null>(puzzle.id);

  useEffect(() => {
    const id = window.setTimeout(() => setVisibleFor(null), 2300);
    return () => window.clearTimeout(id);
  }, [puzzle.id]);

  if (visibleFor !== puzzle.id) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-x-0 top-[30%] z-20 flex animate-[bannerLife_2300ms_ease-out_forwards] flex-col items-center text-center text-white"
    >
      <div className="text-xs font-semibold uppercase tracking-[0.4em] text-white/75 [text-shadow:0_2px_12px_rgb(0_0_0/0.6)]">
        {world.name} · {puzzle.bandLabel}
      </div>
      <div className="mt-1 text-6xl font-bold tracking-tight [text-shadow:0_4px_30px_rgb(0_0_0/0.55)] sm:text-8xl">
        Level {puzzle.level}
      </div>
      {puzzle.modifiers.length > 0 && (
        <div className="mt-3 flex max-w-lg flex-wrap justify-center gap-1.5 px-4">
          {puzzle.modifiers.map((modifier) => (
            <span
              key={modifier.id}
              className="rounded-full border border-white/20 bg-black/35 px-3 py-1 text-xs font-semibold backdrop-blur-md"
            >
              {modifier.title}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function RuleCard({
  modifier,
  remaining,
  onDismiss,
}: {
  modifier: PuzzleModifier;
  remaining: number;
  onDismiss: () => void;
}) {
  return (
    <div
      key={modifier.id}
      className={`pointer-events-auto w-full max-w-sm animate-[popIn_360ms_cubic-bezier(0.34,1.56,0.64,1)] rounded-[1.4rem] border-[#59b8ff]/40 p-4 ${glass}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#9ad2ff]">
          <Sparkles className="size-3.5" strokeWidth={2.2} />
          New rule{remaining > 1 ? ` · 1 of ${remaining}` : ""}
        </div>
        <HapticButton
          type="button"
          onClick={onDismiss}
          className={`-m-1 rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white ${focusRing}`}
          aria-label={`Dismiss ${modifier.title} tip`}
        >
          <X className="size-4" strokeWidth={2.2} />
        </HapticButton>
      </div>
      <h3 className="mt-1.5 text-lg font-bold">{modifier.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-white/70">{modifier.description}</p>
      <HapticButton
        type="button"
        onClick={onDismiss}
        className={`mt-3 w-full rounded-xl bg-white/10 py-2 text-sm font-semibold hover:bg-white/16 ${focusRing}`}
      >
        Got it
      </HapticButton>
    </div>
  );
}

export type CoachStage = "firstMark" | "firstLine" | "rhythm";

const COACH_COPY: Record<CoachStage, { title: string; body: string; action: string }> = {
  firstMark: {
    title: "Pick a pillar",
    body: "Each pillar shows the product its row or column must make. Tap tiles in that line whose numbers multiply to it.",
    action: "Hide guide",
  },
  firstLine: {
    title: "Nice. Finish the line",
    body: "The pillar ring fills as you go and the ×chip shows what's still needed. Meet it and the leftovers crumble away.",
    action: "Got it",
  },
  rhythm: {
    title: "You've got the rhythm",
    body: "Chain correct picks to build a combo. Right-click or hold a tile to use the other tool. Stuck? Hints explain a step.",
    action: "Let's go",
  },
};

export function FirstRunCoach({ stage, onDismiss }: { stage: CoachStage; onDismiss: () => void }) {
  const copy = COACH_COPY[stage];

  return (
    <div
      key={stage}
      aria-live="polite"
      className={`pointer-events-auto w-full max-w-sm animate-[popIn_360ms_cubic-bezier(0.34,1.56,0.64,1)] rounded-[1.4rem] border-[var(--world-accent)]/45 p-4 ${glass}`}
    >
      <div className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[var(--world-accent)]">
        First board
      </div>
      <h3 className="mt-1 text-lg font-bold">{copy.title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-white/70">{copy.body}</p>
      <HapticButton
        type="button"
        onClick={onDismiss}
        className={`mt-3 w-full rounded-xl bg-white/10 py-2 text-sm font-semibold hover:bg-white/16 ${focusRing}`}
        aria-label="Dismiss first board guide"
      >
        {copy.action}
      </HapticButton>
    </div>
  );
}
