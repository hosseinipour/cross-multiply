export const glass =
  "border border-white/12 bg-[oklch(17%_0.025_265/0.58)] text-white shadow-[0_12px_40px_rgb(0_0_0/0.32)] backdrop-blur-xl";

export const focusRing =
  "focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[var(--world-accent)]";

export const iconButton = `relative grid size-11 shrink-0 place-items-center rounded-2xl transition duration-150 hover:bg-white/14 active:scale-95 disabled:cursor-not-allowed disabled:opacity-45 sm:size-12 ${glass} ${focusRing}`;

export const primaryButton = `inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl bg-[var(--world-accent)] px-5 text-base font-bold text-[var(--world-accent-ink)] shadow-[inset_0_-4px_0_rgb(0_0_0/0.22),0_10px_30px_color-mix(in_oklch,var(--world-accent)_40%,transparent)] transition duration-150 hover:brightness-110 active:translate-y-0.5 active:shadow-[inset_0_-2px_0_rgb(0_0_0/0.22)] ${focusRing}`;

export const secondaryButton = `inline-flex min-h-13 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/8 px-5 text-base font-semibold text-white transition duration-150 hover:bg-white/14 active:translate-y-0.5 ${focusRing}`;

export const eyebrow = "text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white/55";
