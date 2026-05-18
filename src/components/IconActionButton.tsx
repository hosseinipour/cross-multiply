import type { ComponentProps, ReactNode } from "react";
import { HapticButton } from "./HapticButton";

const iconButtonClass =
  "relative inline-flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-full border border-[var(--panel-border)] bg-[var(--panel-muted)] p-2.5 text-[var(--text-primary)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_45%,transparent)] transition duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]/50 hover:bg-[var(--accent-soft)] active:translate-y-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-11 sm:min-w-11 sm:p-3";

export function IconActionButton({
  children,
  className = "",
  title,
  ...props
}: {
  children: ReactNode;
} & ComponentProps<typeof HapticButton>) {
  const fallbackTitle =
    title ??
    (typeof props["aria-label"] === "string" ? props["aria-label"] : undefined);

  return (
    <HapticButton
      {...props}
      title={fallbackTitle}
      className={`${iconButtonClass} ${className}`}
    >
      {children}
    </HapticButton>
  );
}
