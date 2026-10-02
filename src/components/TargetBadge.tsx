import { Check } from "lucide-react";

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
  axis = "row",
  concealment = null,
  factorChips,
  highlighted = false,
  index,
  progressHidden = false,
  target,
  progress,
  resolved,
}: {
  axis?: "row" | "column";
  target: number | null;
  concealment?: "blind" | "deepFog" | "fog" | null;
  factorChips?: number[];
  highlighted?: boolean;
  index?: number;
  progressHidden?: boolean;
  progress: number;
  resolved: boolean;
}) {
  const hidden = target === null;
  const need = hidden ? null : target / progress;
  const lineName =
    index === undefined ? "Target" : `${axis === "row" ? "Row" : "Column"} ${index + 1}`;
  const description = resolved
    ? `${lineName} solved`
    : hidden
      ? `${lineName} target hidden`
      : `${lineName} target ${formatter.format(target)}${
          !progressHidden && need !== null && progress > 1
            ? `, needs ×${formatter.format(need)} more`
            : ""
        }`;
  const ciphered = !hidden && Boolean(factorChips?.length);
  const hiddenLabel = concealment === "blind" ? "Blind" : "Fog";
  const factorRows = factorChips ? getFactorRows(factorChips) : [];
  const factorPowers = factorChips ? getFactorPowers(factorChips) : [];

  return (
    <div
      role="img"
      aria-label={description}
      className={`game-number relative flex aspect-square items-center justify-center rounded-[1rem] border text-center spring-transition sm:rounded-[1.25rem] ${
        highlighted && !resolved
          ? "outline-[color-mix(in_oklch,var(--accent)_70%,transparent)]"
          : "outline-transparent"
      } outline outline-2 outline-offset-2 ${
        resolved
          ? "border-transparent bg-[color-mix(in_oklch,var(--success)_10%,transparent)] text-[var(--success)] scale-[0.86]"
          : hidden
            ? concealment === "blind"
              ? "border-dashed border-[var(--berry)]/45 bg-[color-mix(in_oklch,var(--berry)_12%,transparent)] text-[var(--berry)]"
              : "border-dashed border-[var(--target-border)] bg-[var(--panel-muted)]/50 text-[var(--text-muted)]"
            : "border-[var(--target-border)] bg-[var(--target-bg)] text-[var(--text-primary)] shadow-[inset_0_-3px_0_color-mix(in_oklch,var(--target-border)_45%,transparent),0_8px_16px_var(--shadow-soft)]"
      }`}
    >

      {resolved && (
        <Check
          aria-hidden="true"
          className="h-[45%] w-[45%] opacity-70 [animation:goodPop_320ms_cubic-bezier(0.34,1.56,0.64,1)]"
          strokeWidth={2.6}
        />
      )}

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
          {need !== null && progress > 1 && !progressHidden && (
            <span
              aria-hidden="true"
              className={`absolute rounded-full bg-[var(--accent-soft)] px-1 py-px font-black leading-none text-[var(--accent-strong)] ${
                ciphered
                  ? "hidden sm:right-1 sm:top-1 sm:block sm:text-[0.7rem]"
                  : "right-0.5 top-0.5 text-[0.62rem] sm:right-1 sm:top-1 sm:text-[0.74rem]"
              }`}
            >
              {need === 1 ? "✓" : `×${formatter.format(need)}`}
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
