import type { ReactNode } from "react";

const statusPillToneClass = {
  neutral:
    "border-[var(--panel-border)] bg-[var(--panel-muted)] text-[var(--text-secondary)] shadow-[inset_0_-2px_0_color-mix(in_oklch,var(--panel-border)_35%,transparent)]",
  lemon:
    "border-[var(--lemon)]/45 bg-[color-mix(in_oklch,var(--lemon)_22%,transparent)] text-[var(--text-primary)]",
  sky:
    "border-[var(--sky)]/35 bg-[color-mix(in_oklch,var(--sky)_16%,transparent)] text-[var(--sky)]",
  berry:
    "border-[var(--berry)]/35 bg-[color-mix(in_oklch,var(--berry)_16%,transparent)] text-[var(--berry)]",
  danger:
    "border-[var(--danger)]/35 bg-[color-mix(in_oklch,var(--danger)_16%,transparent)] text-[var(--danger)]",
  accent:
    "border-[var(--accent)]/35 bg-[var(--accent-soft)] text-[var(--accent-strong)]",
} as const;

export type StatusPillTone = keyof typeof statusPillToneClass;

export function StatusPill({
  children,
  icon,
  tone = "neutral",
}: {
  children: ReactNode;
  icon: ReactNode;
  tone?: StatusPillTone;
}) {
  return (
    <div
      className={`inline-flex min-h-8 max-w-full shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] ${statusPillToneClass[tone]}`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="min-w-0 truncate">{children}</span>
    </div>
  );
}
