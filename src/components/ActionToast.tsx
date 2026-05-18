import type { GameStatus } from "../appState";

export function ActionToast({
  isPending,
  status,
}: {
  isPending: boolean;
  status: GameStatus;
}) {
  if (!isPending && status === "playing") {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 mx-auto flex w-fit max-w-[90vw] items-center gap-3 rounded-full border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 px-4 py-3 text-sm font-bold text-[var(--text-primary)] shadow-[0_18px_48px_var(--shadow-board)] backdrop-blur lg:bottom-4"
    >
      {isPending && <span>Building a fresh board...</span>}
      {!isPending && status === "won" && (
        <span>Level cleared. Review your stars and missions.</span>
      )}
      {!isPending && status === "lost" && (
        <span>Out of hearts. Retry this board or start a new layout.</span>
      )}
    </div>
  );
}
