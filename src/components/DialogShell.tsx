import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export function DialogShell({
  actions,
  children,
  icon,
  size = "sm",
  title,
}: {
  actions?: ReactNode;
  children: ReactNode;
  icon: ReactNode;
  size?: "sm" | "lg";
  title: string;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const firstFocusable = dialogRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    (firstFocusable ?? dialogRef.current)?.focus();

    return () => {
      previousFocus?.focus();
    };
  }, []);

  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") {
      return;
    }

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    if (!focusable?.length) {
      event.preventDefault();
      dialogRef.current?.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[oklch(11%_0.015_240/0.65)] p-4 py-8 backdrop-blur-md sm:items-center sm:p-5">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className={`dialog-surface animate-spring-in max-h-[calc(100vh-2.5rem)] w-full overflow-y-auto rounded-[2.25rem] border border-[var(--panel-border)] p-6 shadow-[0_32px_96px_var(--shadow-board)] sm:p-8 ${
          size === "lg" ? "max-w-lg" : "max-w-sm text-center"
        }`}
      >
        <div className="flex flex-col items-center">
          {icon}
          <h2
            id={titleId}
            className={`mt-5 text-[1.75rem] font-black leading-tight tracking-tight text-[var(--text-primary)] ${
              size === "lg" ? "text-center" : ""
            }`}
          >
            {title}
          </h2>
        </div>
        <div className="mt-3 text-sm text-[var(--text-secondary)] leading-relaxed">
          {children}
        </div>
        {actions && <div className="mt-7 grid gap-3 sm:grid-cols-2">{actions}</div>}
      </div>
    </div>
  );
}
