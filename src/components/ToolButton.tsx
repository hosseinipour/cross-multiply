import type { ReactNode } from "react";
import { HapticButton } from "./HapticButton";

export function ToolButton({
  active,
  onClick,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
}) {
  return (
    <HapticButton
      type="button"
      onClick={onClick}
      className={`rounded-[1.15rem] border px-3 py-3 text-left transition sm:rounded-[1.4rem] sm:px-4 sm:py-4 ${
        active
          ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)] shadow-[0_10px_30px_rgba(247,122,168,0.18)]"
          : "border-[var(--panel-border)] bg-[var(--panel-bg)] text-[var(--text-secondary)] hover:border-[var(--accent)]/30 hover:bg-[var(--panel-muted)]"
      }`}
    >
      <div className="flex items-center justify-center">
        <span className="flex h-9 w-9 items-center justify-center sm:h-12 sm:w-12">
          {icon}
        </span>
      </div>
    </HapticButton>
  );
}
