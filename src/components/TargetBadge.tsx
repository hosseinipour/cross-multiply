const formatter = new Intl.NumberFormat();

export function TargetBadge({
  target,
  progress,
  resolved,
}: {
  target: number | null;
  progress: number;
  resolved: boolean;
}) {
  const hidden = target === null;

  return (
    <div
      className={`relative flex aspect-square items-center justify-center rounded-[0.9rem] border px-1 text-center transition sm:rounded-[1rem] ${
        resolved
          ? "border-transparent bg-transparent text-transparent"
          : hidden
            ? "border-dashed border-[var(--target-border)] bg-[var(--panel-muted)]/70 text-[var(--text-muted)]"
            : "border-[var(--target-border)] bg-[var(--target-bg)] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      }`}
    >
      {!resolved && (
        <>
          <span className="font-['Trebuchet_MS'] font-bold text-[clamp(0.8rem,1.8vw,1.4rem)] sm:text-[clamp(0.9rem,2vw,1.4rem)]">
            {hidden ? "?" : formatter.format(target)}
          </span>
          {!hidden && progress > 1 && (
            <span className="absolute right-1 top-1 text-[0.55rem] font-semibold leading-none text-[var(--accent)] sm:right-1.5 sm:top-1.5 sm:text-[0.6rem]">
              {formatter.format(progress)}
            </span>
          )}
          {hidden && (
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[0.5rem] uppercase tracking-[0.2em] text-[var(--text-faint)]">
              Fog
            </span>
          )}
        </>
      )}
    </div>
  );
}
