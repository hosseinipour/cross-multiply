import { useEffect, useState, type ReactNode } from "react";
import { Info, Lightbulb, ShieldAlert, Sparkles } from "lucide-react";
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

/** Compact enough to sit above the tool dock on a phone without hiding rows. */
function GuideCard({
  eyebrow,
  title,
  body,
  action,
  actionLabel,
  tone,
  onAction,
}: {
  eyebrow: ReactNode;
  title: string;
  body: string;
  action: string;
  actionLabel?: string;
  tone: string;
  onAction: () => void;
}) {
  return (
    <div
      aria-live="polite"
      className={`pointer-events-auto w-full max-w-sm animate-[popIn_360ms_cubic-bezier(0.34,1.56,0.64,1)] rounded-[1.25rem] px-3.5 py-3 sm:rounded-[1.4rem] sm:p-4 ${glass}`}
      style={{ borderColor: `color-mix(in oklch, ${tone} 45%, transparent)` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className="flex items-center gap-1.5 text-[0.62rem] font-semibold uppercase tracking-[0.18em] sm:text-[0.68rem]"
            style={{ color: tone }}
          >
            {eyebrow}
          </div>
          <h3 className="mt-0.5 text-base font-bold leading-tight sm:text-lg">{title}</h3>
        </div>
        <HapticButton
          type="button"
          onClick={onAction}
          aria-label={actionLabel}
          className={`shrink-0 rounded-full bg-white/12 px-3.5 py-1.5 text-xs font-semibold hover:bg-white/20 ${focusRing}`}
        >
          {action}
        </HapticButton>
      </div>
      <p className="mt-1.5 text-[0.8rem] leading-snug text-white/72 sm:text-sm sm:leading-relaxed">{body}</p>
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
    <GuideCard
      key={modifier.id}
      tone="#9ad2ff"
      eyebrow={
        <>
          <Sparkles className="size-3.5" strokeWidth={2.2} />
          New rule{remaining > 1 ? ` · 1 of ${remaining}` : ""}
        </>
      }
      title={modifier.title}
      body={modifier.description}
      action="Got it"
      actionLabel={`Dismiss ${modifier.title} tip`}
      onAction={onDismiss}
    />
  );
}

export type CoachStage = "firstMark" | "firstLine" | "rhythm";

const COACH_COPY: Record<CoachStage, { title: string; body: string; action: string }> = {
  firstMark: {
    title: "Pick a pillar",
    body: "Each pillar shows the product its row or column must make. Tap tiles in that line whose numbers multiply to it.",
    action: "Hide",
  },
  firstLine: {
    title: "Nice. Finish the line",
    body: "The pillar ring fills as you go and the ×chip shows what's still needed. Meet it and the leftovers crumble away.",
    action: "Got it",
  },
  rhythm: {
    title: "You've got the rhythm",
    body: "Chain correct picks to build a combo. Right-click or press and hold a tile to use the other tool. Stuck? Hints explain a step.",
    action: "Let's go",
  },
};

export function FirstRunCoach({ stage, onDismiss }: { stage: CoachStage; onDismiss: () => void }) {
  const copy = COACH_COPY[stage];

  return (
    <GuideCard
      key={stage}
      tone="var(--world-accent)"
      eyebrow="First board"
      title={copy.title}
      body={copy.body}
      action={copy.action}
      actionLabel="Dismiss first board guide"
      onAction={onDismiss}
    />
  );
}
