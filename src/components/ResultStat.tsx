import type { ReactNode } from "react";

export function ResultStat({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="rounded-[1.2rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] px-2 py-2.5 text-center shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_35%,transparent)] sm:px-4 sm:py-3">
      <div className="text-[10px] font-black uppercase tracking-[0.16em] text-[var(--text-muted)] sm:text-xs sm:tracking-[0.22em]">
        {label}
      </div>
      <div className="game-number mt-1.5 text-xl font-black text-[var(--text-primary)] sm:mt-2 sm:text-2xl">
        {value}
      </div>
    </div>
  );
}
