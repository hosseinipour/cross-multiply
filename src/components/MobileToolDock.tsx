import type { ReactNode } from "react";
import { CheckCircle2, Eraser } from "lucide-react";
import type { ToolMode } from "../game";
import { HapticButton } from "./HapticButton";

export function MobileToolDock({
  mode,
  onModeChange,
  toolLocked,
}: {
  mode: ToolMode;
  onModeChange: (mode: ToolMode) => void;
  toolLocked: boolean;
}) {
  const tools: Array<{ icon: ReactNode; label: string; mode: ToolMode }> = [
    {
      icon: <Eraser className="h-5 w-5" strokeWidth={1.8} />,
      label: "Erase",
      mode: "erase",
    },
    {
      icon: <CheckCircle2 className="h-5 w-5" strokeWidth={1.8} />,
      label: "Select",
      mode: "select",
    },
  ];

  return (
    <div className="fixed inset-x-3 bottom-3 z-30 rounded-[1.35rem] border border-[var(--panel-border)] bg-[var(--panel-bg)]/95 p-2 shadow-[0_18px_48px_var(--shadow-board)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-2 gap-2">
        {tools.map((tool) => {
          const active = mode === tool.mode;
          const disabled = toolLocked && !active;

          return (
            <HapticButton
              key={tool.mode}
              type="button"
              onClick={() => onModeChange(tool.mode)}
              disabled={disabled}
              aria-pressed={active}
              aria-label={`${tool.label}${disabled ? " locked for now" : ""}`}
              className={`flex min-h-14 min-w-0 items-center justify-center gap-1.5 rounded-[1rem] border px-2 text-[0.83rem] font-black transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 sm:gap-2 sm:px-3 sm:text-sm ${
                active
                  ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--text-primary)] shadow-[inset_0_-3px_0_color-mix(in_oklch,var(--accent)_28%,transparent)]"
                  : "border-[var(--panel-border)] bg-[var(--panel-muted)] text-[var(--text-secondary)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_45%,transparent)] hover:border-[var(--accent)]/40 active:translate-y-0.5"
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full ${
                  active
                    ? "bg-[var(--accent)] text-[var(--cell-highlight-text)]"
                    : "bg-[var(--panel-bg)] text-[var(--text-muted)]"
                }`}
              >
                {tool.icon}
              </span>
              <span className="min-w-0 truncate">{tool.label}</span>
            </HapticButton>
          );
        })}
      </div>
    </div>
  );
}
