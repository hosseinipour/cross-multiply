import { useEffect, useState } from "react";
import { Eye, Heart, Lightbulb, Lock, ShieldAlert, Sparkles, Timer } from "lucide-react";
import { foldElapsed, type SessionState } from "../appState";
import { formatDuration } from "../components/formatDuration";
import { getBoardStatuses, type StatusIcon, type StatusTone } from "./boardStatus";
import { glass } from "./ui";

const TONE_CLASSES: Record<StatusTone, string> = {
  danger: "border-[#ff6b6b]/45 text-[#ffb3b3]",
  sky: "border-[#59b8ff]/45 text-[#b8e0ff]",
  lemon: "border-[#ffd84a]/45 text-[#ffeaa0]",
  berry: "border-[#e070c8]/45 text-[#f5c2ec]",
  accent: "border-[var(--world-accent)]/50 text-white",
};

const ICONS: Record<StatusIcon, typeof Lock> = {
  lock: Lock,
  shield: ShieldAlert,
  bulb: Lightbulb,
  spark: Sparkles,
  eye: Eye,
};

function LiveTimer({ session }: { session: SessionState }) {
  const [elapsed, setElapsed] = useState(session.elapsedMs);

  useEffect(() => {
    const tick = () => setElapsed(foldElapsed(session, Date.now()));
    tick();
    if (session.activeSince === null) {
      return;
    }
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [session]);

  return (
    <span className="inline-flex items-center gap-1.5 tabular-nums" aria-label={`Time ${formatDuration(elapsed)}`}>
      <Timer className="size-4 text-white/60" strokeWidth={2} />
      {formatDuration(elapsed)}
    </span>
  );
}

function Hearts({ hearts, maxHearts }: { hearts: number; maxHearts: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${hearts} of ${maxHearts} hearts`}>
      {Array.from({ length: maxHearts }, (_, index) => {
        const full = index < hearts;
        return (
          <Heart
            key={`${index}-${full}`}
            className={`size-[1.15rem] ${
              full
                ? "fill-[#ff5d73] text-[#ff5d73] drop-shadow-[0_0_6px_rgb(255_93_115/0.6)]"
                : "animate-[heartBreak_420ms_ease-out] text-white/25"
            }`}
            strokeWidth={2.2}
          />
        );
      })}
    </span>
  );
}

export function StatusBar({ session }: { session: SessionState }) {
  const { puzzle } = session;
  const total = puzzle.size * puzzle.size;
  const placed = session.marks.flat().filter((mark) => mark !== "hidden").length;
  const percent = Math.round((placed / total) * 100);
  const statuses = getBoardStatuses(session);
  const visible = statuses.slice(0, 3);
  const tucked = statuses.length - visible.length;

  return (
    <div className="pointer-events-none flex flex-col items-center gap-2 px-3 pt-2 sm:pt-3 short-land:items-start short-land:px-0">
      <div className={`flex items-center gap-3 rounded-full px-4 py-2 text-sm font-semibold sm:gap-4 short-land:gap-3 ${glass}`}>
        <Hearts hearts={session.hearts} maxHearts={session.maxHearts} />
        <span className="h-4 w-px bg-white/20" aria-hidden="true" />
        <LiveTimer session={session} />
        <span className="h-4 w-px bg-white/20" aria-hidden="true" />
        <span
          role="progressbar"
          aria-label="Board progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={placed}
          className="inline-flex items-center gap-2 tabular-nums"
        >
          <span className="h-1.5 w-10 overflow-hidden rounded-full bg-white/15 sm:w-16">
            <span
              className="block h-full rounded-full bg-[var(--world-accent)] transition-[width] duration-500"
              style={{ width: `${percent}%` }}
            />
          </span>
          {placed}/{total}
        </span>
      </div>

      {visible.length > 0 && (
        // One swipeable row on phones so chips never push the board down a line.
        <ul
          className="pointer-events-auto mx-auto flex w-fit max-w-full flex-nowrap gap-1.5 overflow-x-auto px-1 [scrollbar-width:none] sm:flex-wrap sm:justify-center sm:overflow-visible short-land:mx-0 short-land:justify-start short-land:px-0"
          aria-label="Active constraints"
        >
          {visible.map((status) => {
            const Icon = ICONS[status.icon];
            return (
              <li
                key={status.key}
                className={`inline-flex shrink-0 animate-[popIn_260ms_cubic-bezier(0.34,1.56,0.64,1)] items-center gap-1.5 whitespace-nowrap rounded-full border bg-[oklch(17%_0.025_265/0.62)] px-3 py-1 text-xs font-semibold backdrop-blur-xl ${TONE_CLASSES[status.tone]}`}
              >
                <Icon className="size-3.5" strokeWidth={2.2} />
                {status.label}
              </li>
            );
          })}
          {tucked > 0 && (
            <li className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-white/15 bg-[oklch(17%_0.025_265/0.62)] px-3 py-1 text-xs font-semibold text-white/70 backdrop-blur-xl">
              +{tucked} more
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
