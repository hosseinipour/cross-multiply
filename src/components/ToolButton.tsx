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
      className={`rounded-[1.15rem] border px-3 py-3 text-left transition disabled:cursor-not-allowed disabled:opacity-55 sm:rounded-[1.4rem] sm:px-4 sm:py-4 ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)] shadow-[0_10px_30px_rgba(247,122,168,0.18)]"
          : "border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-secondary)] hover:border-[var(--accent)]/30 hover:bg-[var(--panel-muted)]"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center sm:h-12 sm:w-12">
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
