import { Heart, Info, Lightbulb, LoaderCircle } from "lucide-react";
import type { Feedback } from "../useCrossMultiplyGame";

const toneClass = {
  hint: "border-[var(--lemon)]/60 bg-[color-mix(in_oklch,var(--lemon)_18%,var(--panel-bg))]",
  danger: "border-[var(--danger)]/35 bg-[color-mix(in_oklch,var(--danger)_10%,var(--panel-bg))]",
  info: "border-[var(--sky)]/35 bg-[color-mix(in_oklch,var(--sky)_10%,var(--panel-bg))]",
} as const;

const toneIcon = {
  hint: <Lightbulb className="h-4 w-4 shrink-0 text-[var(--accent-pop)]" strokeWidth={2} />,
  danger: <Heart className="h-4 w-4 shrink-0 fill-current text-[var(--danger)]" strokeWidth={2} />,
  info: <Info className="h-4 w-4 shrink-0 text-[var(--sky)]" strokeWidth={2} />,
};

export function ActionToast({
  feedback,
  isPending,
}: {
  feedback: Feedback | null;
  isPending: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[5.5rem] z-40 flex justify-center px-4 lg:bottom-6"
    >
      {isPending ? (
        <div className="flex items-center gap-2.5 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 px-4 py-3 text-sm font-bold text-[var(--text-primary)] shadow-[0_18px_48px_var(--shadow-board)] backdrop-blur [animation:toastIn_220ms_ease-out]">
          <LoaderCircle className="h-4 w-4 animate-spin text-[var(--accent)]" />
          Building a fresh board...
        </div>
      ) : (
        feedback && (
          <div
            key={feedback.id}
            className={`flex max-w-[min(30rem,100%)] items-start gap-2.5 rounded-[1.25rem] border px-4 py-3 text-left text-sm font-semibold leading-snug text-[var(--text-primary)] shadow-[0_18px_48px_var(--shadow-board)] backdrop-blur [animation:toastIn_220ms_ease-out] ${toneClass[feedback.tone]}`}
          >
            <span className="mt-0.5">{toneIcon[feedback.tone]}</span>
            <span>{feedback.message}</span>
          </div>
        )
      )}
    </div>
  );
}
