import { CheckCircle2, Eraser, Lightbulb } from "lucide-react";
import { HapticButton } from "./HapticButton";

export type FirstRunStage = "firstMark" | "firstLine" | "rhythm";

export function FirstRunCoach({
  onDismiss,
  stage,
}: {
  onDismiss: () => void;
  stage: FirstRunStage;
}) {
  const stageCopy = {
    firstMark: {
      title: "Start with one edge target",
      body: "Choose a row or column target. Select numbers in that line that multiply to it.",
      action: "Hide guide",
    },
    firstLine: {
      title: "Good mark. Complete the target",
      body: "When your selected numbers multiply to the edge target, that line clears. Erase numbers that do not fit.",
      action: "Got it",
    },
    rhythm: {
      title: "You have the rhythm",
      body: "Clear edge targets one by one. Use a hint when the next line stalls.",
      action: "Got it",
    },
  } satisfies Record<
    FirstRunStage,
    { title: string; body: string; action: string }
  >;
  const current = stageCopy[stage];
  const guideItems = [
    {
      icon: <CheckCircle2 className="h-4 w-4 text-[var(--accent)]" strokeWidth={1.8} />,
      label: "Select factors",
    },
    {
      icon: <Eraser className="h-4 w-4 text-[var(--text-muted)]" strokeWidth={1.8} />,
      label: "Erase extras",
    },
    {
      icon: <Lightbulb className="h-4 w-4 text-[var(--accent-pop)]" strokeWidth={1.8} />,
      label: "Hint reveals one cell",
    },
  ];

  return (
    <div
      aria-live="polite"
      className="mb-3 w-full max-w-[calc(100vw-2.75rem)] overflow-hidden rounded-[1.25rem] border border-[var(--sky)]/35 bg-[color-mix(in_oklch,var(--sky)_12%,var(--panel-bg))] px-3 py-3 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--surface)_45%,transparent)] sm:mb-4 sm:max-w-none sm:rounded-[1.35rem] sm:px-4"
    >
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div className="min-w-0 max-w-[65ch]">
          <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[var(--sky)]">
            First board
          </div>
          <h2 className="mt-1 text-base font-black text-[var(--text-primary)]">
            {current.title}
          </h2>
          <p className="mt-1 max-w-[34ch] text-sm leading-5 text-[var(--text-secondary)] sm:max-w-none sm:leading-6">
            {current.body}
          </p>
        </div>
        <HapticButton
          type="button"
          onClick={onDismiss}
          className="inline-flex min-h-9 max-w-[7.25rem] shrink-0 items-center justify-center truncate rounded-full border border-[var(--sky)]/35 bg-[var(--panel-bg)] px-3 text-[0.65rem] font-black uppercase tracking-[0.16em] text-[var(--text-primary)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--sky)_18%,transparent)] transition duration-200 hover:-translate-y-0.5 hover:bg-[var(--panel-muted)] active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--sky)] sm:min-h-11 sm:max-w-none sm:px-4 sm:text-xs sm:tracking-[0.18em]"
          aria-label="Dismiss first board guide"
        >
          {current.action}
        </HapticButton>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-0.5 text-xs font-bold text-[var(--text-secondary)] [scrollbar-width:none] sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
        {guideItems.map((item) => (
          <div
            key={item.label}
            className="flex min-h-10 min-w-max items-center gap-2 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)] px-3 sm:min-h-11 sm:min-w-0"
          >
            {item.icon}
            <span className="whitespace-nowrap">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
