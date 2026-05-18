import type { ReactNode } from "react";

export function SidebarPanel({
  children,
  defaultOpen = true,
  meta,
  title,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  meta?: ReactNode;
  title: string;
}) {
  return (
    <details
      open={defaultOpen}
      className="group rounded-[1.6rem] border border-[var(--panel-border)] bg-[var(--panel-muted)] p-3 shadow-[inset_0_1px_0_color-mix(in_oklch,var(--surface)_55%,transparent)] sm:rounded-[1.75rem] sm:p-4"
    >
      <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 truncate text-xs font-black uppercase tracking-[0.24em] text-[var(--text-muted)]">
          {title}
        </span>
        {meta && (
          <span className="min-w-0 truncate text-right text-xs text-[var(--text-secondary)]">
            {meta}
          </span>
        )}
      </summary>
      <div className="mt-3">{children}</div>
    </details>
  );
}
