const formatter = new Intl.NumberFormat();

export function TargetBadge({
  target,
  progress,
  resolved,
}: {
  target: number;
  progress: number;
  resolved: boolean;
  axis: "row" | "column";
}) {
  return (
    <div
      className={`relative flex aspect-square items-center justify-center rounded-[0.9rem] border px-1 text-center transition sm:rounded-[1rem] ${
        resolved
          ? "border-transparent bg-transparent text-transparent"
          : "border-[var(--target-border)] bg-[var(--target-bg)] text-[var(--text-primary)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      }`}
    >
      {!resolved && (
        <>
          <span className="font-['Trebuchet_MS'] font-bold text-[clamp(0.8rem,1.8vw,1.4rem)] sm:text-[clamp(0.9rem,2vw,1.4rem)]">
            {formatter.format(target)}
          </span>
          {progress > 1 && (
            <span className="absolute right-1 top-1 text-[0.55rem] font-semibold leading-none text-[var(--accent)] sm:right-1.5 sm:top-1.5 sm:text-[0.6rem]">
              {formatter.format(progress)}
            </span>
          )}
        </>
      )}
    </div>
  );
}
