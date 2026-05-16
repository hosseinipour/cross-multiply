import type { ReactNode } from "react";
import { HapticButton } from "./HapticButton";

export function ToolButton({
  active,
  disabled = false,
  onClick,
  icon,
  label,
  meta,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  meta?: string;
}) {
  return (
    <HapticButton
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-[1.25rem] border px-3 py-3 text-left transition duration-200 disabled:cursor-not-allowed disabled:opacity-55 sm:rounded-[1.5rem] sm:px-4 sm:py-4 ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)] shadow-[inset_0_-3px_0_color-mix(in_oklch,var(--accent)_28%,transparent),0_12px_22px_var(--shadow-soft)]"
          : "border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-secondary)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_45%,transparent)] hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:bg-[var(--panel-muted)]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-2xl sm:h-12 sm:w-12 ${
          active ? "bg-[var(--accent)] text-[var(--cell-highlight-text)]" : "bg-[var(--panel-muted)]"
        }`}>
          {icon}
        </span>
        <div className="min-w-0 text-right">
          <div className="text-sm font-semibold text-[var(--text-primary)]">
            {label}
          </div>
          {meta && (
            <div className="text-[0.7rem] uppercase tracking-[0.24em] text-[var(--text-muted)]">
              {meta}
            </div>
          )}
        </div>
      </div>
    </HapticButton>
  );
}
