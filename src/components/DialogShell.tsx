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
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-[oklch(15%_0.02_230/0.5)] p-3 py-6 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleDialogKeyDown}
        className={`dialog-surface max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-[2rem] border border-[var(--panel-border)] p-5 shadow-[0_24px_80px_var(--shadow-board)] sm:p-6 ${
          size === "lg" ? "max-w-lg" : "max-w-sm text-center"
        }`}
      >
        {icon}
        <h2
          id={titleId}
          className={`mt-4 text-3xl font-black text-[var(--text-primary)] ${
            size === "lg" ? "text-center" : ""
          }`}
        >
          {title}
        </h2>
        {children}
        {actions && <div className="mt-6 grid gap-3 sm:grid-cols-2">{actions}</div>}
      </div>
    </div>
  );
}
