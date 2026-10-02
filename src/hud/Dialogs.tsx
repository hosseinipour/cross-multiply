import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { CheckCircle2, HeartCrack, Lightbulb, Sparkles, Star, Timer, XCircle } from "lucide-react";
import {
  computeStars,
  evaluateMissions,
  getLevelResult,
  getRunSummary,
  MAX_HINT_STOCK,
  type ProgressState,
  type SessionState,
} from "../appState";
import { formatDuration } from "../components/formatDuration";
import { HapticButton } from "../components/HapticButton";
import type { DifficultyId } from "../game";
import { primaryButton, secondaryButton } from "./ui";

const FOCUSABLE =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function DialogShell({
  title,
  eyebrow,
  icon,
  children,
  actions,
  wide = false,
  onClose,
}: {
  title: string;
  eyebrow?: string;
  icon?: ReactNode;
  children?: ReactNode;
  actions?: ReactNode;
  wide?: boolean;
  onClose?: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const first =
      dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]") ??
      dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? dialogRef.current)?.focus();

    return () => previousFocus?.focus();
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape" && onClose) {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
    if (!focusable?.length) {
      event.preventDefault();
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[oklch(8%_0.02_265/0.55)] p-3 backdrop-blur-[3px] animate-[fadeIn_240ms_ease-out] sm:items-center sm:p-6"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`relative w-full animate-[dialogIn_420ms_cubic-bezier(0.34,1.56,0.64,1)] rounded-[2rem] border border-white/14 bg-[oklch(19%_0.03_265/0.9)] p-6 text-white shadow-[0_30px_100px_rgb(0_0_0/0.5)] backdrop-blur-2xl sm:p-8 ${
          wide ? "max-w-lg" : "max-w-sm"
        }`}
      >
        <div className="flex flex-col items-center text-center">
          {icon}
          {eyebrow && (
            <div className="mt-3 text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-white/55">
              {eyebrow}
            </div>
          )}
          <h2 id={titleId} className="mt-1 text-3xl font-bold tracking-tight">
            {title}
          </h2>
        </div>
        {children}
        {actions && <div className="mt-7 grid gap-2.5 sm:grid-cols-2">{actions}</div>}
      </div>
    </div>
  );
}

function useDelayedOpen(open: boolean, delayMs: number) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const id = window.setTimeout(() => setShown(true), delayMs);
    return () => {
      window.clearTimeout(id);
      setShown(false);
    };
  }, [delayMs, open]);

  return open && shown;
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-2 py-3 text-center">
      <div className="text-xl font-bold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-white/50">{label}</div>
    </div>
  );
}

export function WinDialog({
  session,
  progress,
  difficulty,
  hintStock,
  onNext,
  onReplay,
}: {
  session: SessionState;
  progress: ProgressState;
  difficulty: DifficultyId;
  hintStock: number;
  onNext: () => void;
  onReplay: () => void;
}) {
  const open = useDelayedOpen(session.status === "won", 1500);

  if (!open) {
    return null;
  }

  const { puzzle } = session;
  const result = getLevelResult(progress, difficulty, puzzle.level);
  const summary = session.lastWin;
  const newBest =
    summary && summary.previousBestMs !== null && summary.timeMs < summary.previousBestMs;
  const run = getRunSummary(session);
  const runStars = computeStars(puzzle, run);
  const missionsThisRun = evaluateMissions(puzzle, run, session.eraseUsedBeforeRowsResolved);

  return (
    <DialogShell
      wide
      eyebrow={`Level ${puzzle.level} · ${puzzle.bandLabel}`}
      title={runStars === 3 ? "Perfect clear!" : "Level cleared"}
      icon={
        <div className="flex items-end gap-2" aria-label={`${runStars} of 3 stars`}>
          {Array.from({ length: 3 }, (_, index) => (
            <Star
              key={index}
              className={`${index === 1 ? "size-16 -translate-y-2" : "size-12"} ${
                index < runStars
                  ? "fill-[#ffd75e] text-[#ffd75e] drop-shadow-[0_0_18px_rgb(255_215_94/0.7)]"
                  : "text-white/20"
              } animate-[starIn_520ms_cubic-bezier(0.34,1.56,0.64,1)_both]`}
              style={{ animationDelay: `${150 + index * 180}ms` }}
              strokeWidth={1.6}
            />
          ))}
        </div>
      }
      actions={
        <>
          <HapticButton type="button" onClick={onReplay} className={secondaryButton}>
            Replay board
          </HapticButton>
          <HapticButton type="button" onClick={onNext} className={primaryButton} data-autofocus>
            Next level
          </HapticButton>
        </>
      }
    >
      {summary && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm">
          <Timer className="size-4 text-white/60" strokeWidth={2} />
          <span className="text-lg font-bold tabular-nums">{formatDuration(summary.timeMs)}</span>
          {(summary.firstClear || newBest) && (
            <span className="rounded-full bg-[var(--world-accent)] px-2.5 py-0.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[var(--world-accent-ink)]">
              {summary.firstClear ? "First clear" : "New best"}
            </span>
          )}
          {!summary.firstClear && !newBest && summary.previousBestMs !== null && (
            <span className="text-xs text-white/50">Best {formatDuration(summary.previousBestMs)}</span>
          )}
        </div>
      )}

      <div className="mt-5 grid grid-cols-3 gap-2">
        <Stat label="Hearts" value={`${session.hearts}/${session.maxHearts}`} />
        <Stat label="Hints" value={session.hintsUsed} />
        <Stat label="Mistakes" value={session.mistakes} />
      </div>

      <ul className="mt-4 space-y-2">
        {puzzle.missions.map((mission) => {
          const done = missionsThisRun.includes(mission.id);
          return (
            <li
              key={mission.id}
              className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
                done ? "border-[var(--world-accent)]/40 bg-[var(--world-accent)]/10" : "border-white/10 bg-white/5"
              }`}
            >
              <div>
                <div className="text-sm font-semibold">{mission.title}</div>
                <div className="text-xs text-white/55">{mission.description}</div>
              </div>
              {done ? (
                <CheckCircle2 className="size-5 shrink-0 text-[var(--world-accent)]" strokeWidth={2.2} />
              ) : (
                <XCircle className="size-5 shrink-0 text-white/30" strokeWidth={2.2} />
              )}
            </li>
          );
        })}
      </ul>

      {result && result.stars > runStars && (
        <p className="mt-3 text-center text-xs text-white/55">
          Your best on this level stays at {result.stars} stars.
        </p>
      )}
      {hintStock < MAX_HINT_STOCK && (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-white/65">
          <Lightbulb className="size-3.5 text-[#ffd75e]" strokeWidth={2.2} />
          Next level adds a hint to your stock
        </p>
      )}
    </DialogShell>
  );
}

export function LoseDialog({
  session,
  onRetry,
  onReroll,
}: {
  session: SessionState;
  onRetry: () => void;
  onReroll: () => void;
}) {
  const open = useDelayedOpen(session.status === "lost", 900);

  if (!open) {
    return null;
  }

  const total = session.puzzle.size ** 2;
  const placed = session.marks.flat().filter((mark) => mark !== "hidden").length;

  return (
    <DialogShell
      title="Out of hearts"
      icon={
        <div className="grid size-16 place-items-center rounded-full border border-[#ff6b6b]/40 bg-[#ff6b6b]/15 text-[#ff8a8a]">
          <HeartCrack className="size-8" strokeWidth={1.8} />
        </div>
      }
      actions={
        <>
          <HapticButton type="button" onClick={onRetry} className={secondaryButton}>
            Retry board
          </HapticButton>
          <HapticButton type="button" onClick={onReroll} className={primaryButton} data-autofocus>
            New board
          </HapticButton>
        </>
      }
    >
      <p className="mt-3 text-center text-sm leading-relaxed text-white/70">
        You placed <span className="font-bold text-white tabular-nums">{placed}/{total}</span> tiles. Retry this board with what you learned, or shape a new one for the same level.
      </p>
    </DialogShell>
  );
}

export function UnlockDialog({ onClose }: { onClose: () => void }) {
  return (
    <DialogShell
      title="Every world unlocked"
      onClose={onClose}
      icon={
        <div className="grid size-16 place-items-center rounded-full border border-[#ffd75e]/45 bg-[#ffd75e]/15 text-[#ffd75e]">
          <Sparkles className="size-8" strokeWidth={1.8} />
        </div>
      }
      actions={
        <HapticButton type="button" onClick={onClose} className={`sm:col-span-2 ${primaryButton}`} data-autofocus>
          Pick a world
        </HapticButton>
      }
    >
      <p className="mt-3 text-center text-sm text-white/70">
        Sunstone Dunes, Glacier Spire, Ember Caldera, and the Astral Void are open.
      </p>
    </DialogShell>
  );
}
