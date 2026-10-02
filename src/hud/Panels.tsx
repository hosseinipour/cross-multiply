import { CheckCircle2, CircleDashed, Sparkles, XCircle } from "lucide-react";
import {
  getLevelResult,
  getNextLockedDifficulty,
  type ProgressState,
  type SessionState,
} from "../appState";
import { DIFFICULTIES, type DifficultyId } from "../game";
import {
  getDifficultyUnlockRequirement,
  getDifficultyUnlockSource,
} from "../progression";
import { getMissionState } from "./boardStatus";
import { eyebrow } from "./ui";

export function MissionList({
  session,
  progress,
  difficulty,
}: {
  session: SessionState;
  progress: ProgressState;
  difficulty: DifficultyId;
}) {
  const { puzzle } = session;
  const best = getLevelResult(progress, difficulty, puzzle.level);

  return (
    <section>
      <h3 className={eyebrow}>Missions</h3>
      <ul className="mt-2.5 space-y-2">
        {puzzle.missions.map((mission) => {
          const state = getMissionState(session, mission.id);
          const earnedBefore = best?.missionsCompleted.includes(mission.id) ?? false;
          const failed = state === "failed";

          return (
            <li
              key={mission.id}
              className={`flex items-start gap-2.5 rounded-2xl border px-3 py-2.5 transition ${
                failed ? "border-[#ff6b6b]/25 bg-[#ff6b6b]/8" : "border-white/10 bg-white/5"
              }`}
            >
              {failed ? (
                <XCircle className="mt-0.5 size-4 shrink-0 text-[#ff8a8a]" strokeWidth={2.2} />
              ) : earnedBefore ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--world-accent)]" strokeWidth={2.2} />
              ) : (
                <CircleDashed className="mt-0.5 size-4 shrink-0 text-white/55" strokeWidth={2.2} />
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  {mission.title}
                  <span className={`text-[0.62rem] font-semibold uppercase tracking-[0.14em] ${failed ? "text-[#ff9a9a]" : "text-white/45"}`}>
                    {failed ? "Missed" : earnedBefore ? "Earned" : "On track"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-white/60">{mission.description}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function RuleList({ session }: { session: SessionState }) {
  const { puzzle } = session;

  return (
    <section>
      <h3 className={eyebrow}>Board rules</h3>
      {puzzle.modifiers.length === 0 ? (
        <p className="mt-2.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs leading-relaxed text-white/65">
          Classic board. Select the tiles in each line that multiply to its pillar. When a pillar is met, the rest of its line crumbles away.
        </p>
      ) : (
        <ul className="mt-2.5 space-y-2">
          {puzzle.modifiers.map((modifier) => (
            <li key={modifier.id} className="flex gap-2.5 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-[var(--world-accent)]" strokeWidth={2.2} />
              <div>
                <div className="text-sm font-semibold">{modifier.title}</div>
                <p className="mt-0.5 text-xs leading-relaxed text-white/60">{modifier.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function ProgressSummary({
  progress,
  difficulty,
}: {
  progress: ProgressState;
  difficulty: DifficultyId;
}) {
  const nextLocked = getNextLockedDifficulty(progress);
  const source = nextLocked ? getDifficultyUnlockSource(nextLocked) : null;
  const required = nextLocked ? getDifficultyUnlockRequirement(nextLocked) : 0;
  const current = source ? progress[source].clearedLevels : 0;

  return (
    <section>
      <h3 className={eyebrow}>Progress</h3>
      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
          <div className="text-2xl font-bold tabular-nums">{progress[difficulty].clearedLevels}</div>
          <div className="text-xs text-white/55">Levels cleared</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5">
          <div className="text-2xl font-bold tabular-nums">{progress[difficulty].highestUnlockedLevel}</div>
          <div className="text-xs text-white/55">Highest level</div>
        </div>
      </div>
      {nextLocked && source ? (
        <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs text-white/65">
          <div className="flex justify-between gap-2">
            <span>
              Unlock <span className="font-semibold text-white">{DIFFICULTIES[nextLocked].label}</span>
            </span>
            <span className="tabular-nums">
              {Math.min(current, required)}/{required} {DIFFICULTIES[source].label}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/12">
            <div
              className="h-full rounded-full bg-[var(--world-accent)]"
              style={{ width: `${Math.min(100, (current / required) * 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-2 text-xs text-white/65">Every world is open.</p>
      )}
    </section>
  );
}

const CONTROLS: Array<[string, string]> = [
  ["Click", "Mark with current tool"],
  ["Right-click", "Mark with the other tool"],
  ["Hold (touch)", "Mark with the other tool"],
  ["S / E", "Select / Erase tool"],
  ["H", "Hint"],
  ["Arrows", "Move cursor"],
  ["Enter / X", "Mark / other tool"],
];

export function ControlsList() {
  return (
    <section>
      <h3 className={eyebrow}>Controls</h3>
      <dl className="mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
        {CONTROLS.map(([key, label]) => (
          <div key={key} className="contents">
            <dt>
              <kbd className="rounded-md border border-white/20 bg-white/8 px-1.5 py-0.5 font-semibold text-white/85">{key}</kbd>
            </dt>
            <dd className="self-center text-white/60">{label}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
