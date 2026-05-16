const formatter = new Intl.NumberFormat();

export function TargetBadge({
  concealment = null,
  factorChips,
  progressHidden = false,
  target,
  progress,
  resolved,
}: {
  target: number | null;
  concealment?: "blind" | "deepFog" | "fog" | null;
  factorChips?: number[];
  progressHidden?: boolean;
  progress: number;
  resolved: boolean;
}) {
  const hidden = target === null;
  const ciphered = !hidden && Boolean(factorChips?.length);
  const hiddenLabel = concealment === "blind" ? "Blind" : "Fog";

  return (
    <div
      className={`game-number relative flex aspect-square items-center justify-center rounded-[1rem] border px-1 text-center transition duration-200 sm:rounded-[1.15rem] ${
        resolved
          ? "border-transparent bg-transparent text-transparent"
          : hidden
            ? concealment === "blind"
              ? "border-dashed border-[var(--berry)]/45 bg-[color-mix(in_oklch,var(--berry)_16%,transparent)] text-[var(--berry)]"
              : "border-dashed border-[var(--target-border)] bg-[var(--panel-muted)]/70 text-[var(--text-muted)]"
            : "border-[var(--target-border)] bg-[var(--target-bg)] text-[var(--text-primary)] shadow-[inset_0_-3px_0_color-mix(in_oklch,var(--target-border)_34%,transparent),0_8px_18px_var(--shadow-soft)]"
      }`}
    >
      {!resolved && (
        <>
          <span
            className={`font-extrabold ${
              ciphered
                ? "max-w-full px-1 text-[clamp(0.5rem,1.4vw,0.9rem)] leading-tight"
                : "text-[clamp(0.8rem,1.8vw,1.4rem)] sm:text-[clamp(0.9rem,2vw,1.4rem)]"
            }`}
          >
            {hidden
              ? "?"
              : ciphered
                ? factorChips?.join(" x ")
                : formatter.format(target)}
          </span>
          {!hidden && progress > 1 && !progressHidden && (
            <span className="absolute right-1 top-1 rounded-full bg-[var(--accent-soft)] px-1 text-[0.55rem] font-black leading-none text-[var(--accent-strong)] sm:right-1.5 sm:top-1.5 sm:text-[0.6rem]">
              {formatter.format(progress)}
            </span>
          )}
          {ciphered && (
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[0.48rem] uppercase tracking-[0.18em] text-[var(--accent-strong)]">
              Factors
            </span>
          )}
          {hidden && (
            <span
              className={`absolute bottom-1 left-1/2 -translate-x-1/2 text-[0.5rem] uppercase tracking-[0.2em] ${
                concealment === "blind" ? "text-[var(--berry)]/75" : "text-[var(--text-faint)]"
              }`}
            >
              {hiddenLabel}
            </span>
          )}
        </>
      )}
    </div>
  );
}
