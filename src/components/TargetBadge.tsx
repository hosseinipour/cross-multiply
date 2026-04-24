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
      className={`relative flex aspect-square items-center justify-center rounded-[0.9rem] border px-1 text-center transition sm:rounded-[1rem] ${
        resolved
          ? "border-transparent bg-transparent text-transparent"
          : hidden
            ? concealment === "blind"
              ? "border-dashed border-violet-300/35 bg-violet-400/10 text-violet-100"
              : "border-dashed border-[var(--target-border)] bg-[var(--panel-muted)]/70 text-[var(--text-muted)]"
            : "border-[var(--target-border)] bg-[var(--target-bg)] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      }`}
    >
      {!resolved && (
        <>
          <span
            className={`font-['Trebuchet_MS'] font-bold ${
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
            <span className="absolute right-1 top-1 text-[0.55rem] font-semibold leading-none text-[var(--accent)] sm:right-1.5 sm:top-1.5 sm:text-[0.6rem]">
              {formatter.format(progress)}
            </span>
          )}
          {ciphered && (
            <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[0.48rem] uppercase tracking-[0.18em] text-teal-200/75">
              Factors
            </span>
          )}
          {hidden && (
            <span
              className={`absolute bottom-1 left-1/2 -translate-x-1/2 text-[0.5rem] uppercase tracking-[0.2em] ${
                concealment === "blind" ? "text-violet-100/65" : "text-[var(--text-faint)]"
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
