const formatter = new Intl.NumberFormat();

function getFactorRows(factors: number[]) {
  const rowSize = factors.length > 4 ? 3 : 2;
  const rows: number[][] = [];

  for (let index = 0; index < factors.length; index += rowSize) {
    rows.push(factors.slice(index, index + rowSize));
  }

  return rows;
}

function getFactorPowers(factors: number[]) {
  return factors.reduce<Array<{ base: number; count: number }>>((powers, base) => {
    const previous = powers.at(-1);

    if (previous?.base === base) {
      previous.count += 1;
      return powers;
    }

    powers.push({ base, count: 1 });
    return powers;
  }, []);
}

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
  const factorRows = factorChips ? getFactorRows(factorChips) : [];
  const factorPowers = factorChips ? getFactorPowers(factorChips) : [];

  return (
    <div
      className={`game-number relative flex aspect-square items-center justify-center rounded-[1rem] border text-center transition duration-200 sm:rounded-[1.15rem] ${
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
          {ciphered ? (
            <>
              <span className="grid w-full max-w-[calc(100%-0.5rem)] grid-cols-3 place-items-center gap-0.5 px-0.5 text-[0.58rem] font-black leading-none text-[var(--text-primary)] sm:hidden">
                {factorPowers.map(({ base, count }) => (
                  <span
                    key={`${base}-${count}`}
                    className="inline-flex min-w-0 max-w-full items-baseline justify-center rounded-full bg-[color-mix(in_oklch,var(--accent-soft)_64%,transparent)] px-1 py-0.5"
                  >
                    {base}
                    {count > 1 && (
                      <sup className="ml-px text-[0.48rem] leading-none">
                        {count}
                      </sup>
                    )}
                  </span>
                ))}
              </span>
              <span className="hidden max-w-full flex-col items-center justify-center gap-1 px-1 pb-3 text-[0.78rem] font-black leading-[0.9rem] text-[var(--text-primary)] sm:flex">
                {factorRows.map((row, index) => (
                  <span
                    key={`${row.join("-")}-${index}`}
                    className="whitespace-nowrap"
                  >
                    {row.join(" x ")}
                  </span>
                ))}
              </span>
            </>
          ) : (
            <span className="px-1 text-[clamp(0.8rem,1.8vw,1.4rem)] font-extrabold sm:text-[clamp(0.9rem,2vw,1.4rem)]">
              {hidden ? "?" : formatter.format(target)}
            </span>
          )}
          {!hidden && progress > 1 && !progressHidden && (
            <span
              className={`absolute rounded-full bg-[var(--accent-soft)] px-1 font-black leading-none text-[var(--accent-strong)] ${
                ciphered
                  ? "hidden sm:right-1.5 sm:top-1.5 sm:block sm:text-[0.6rem]"
                  : "right-1 top-1 text-[0.55rem] sm:right-1.5 sm:top-1.5 sm:text-[0.6rem]"
              }`}
            >
              {formatter.format(progress)}
            </span>
          )}
          {ciphered && (
            <span className="absolute bottom-1 left-1/2 hidden -translate-x-1/2 text-[0.48rem] uppercase tracking-[0.18em] text-[var(--accent-strong)] sm:block">
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
