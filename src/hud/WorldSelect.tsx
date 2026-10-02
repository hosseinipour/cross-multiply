import { Lock, Play, X } from "lucide-react";
import { isDifficultyAvailable, type ProgressState } from "../appState";
import { HapticButton } from "../components/HapticButton";
import { DIFFICULTIES, DIFFICULTY_ORDER, type DifficultyId } from "../game";
import {
  getDifficultyUnlockRequirement,
  getDifficultyUnlockSource,
} from "../progression";
import { WORLDS } from "../scene/worlds";
import { DialogShell } from "./Dialogs";
import { focusRing } from "./ui";

export function WorldSelect({
  current,
  progress,
  onChoose,
  onClose,
}: {
  current: DifficultyId;
  progress: ProgressState;
  onChoose: (difficulty: DifficultyId) => void;
  onClose: () => void;
}) {
  return (
    <DialogShell title="Choose a world" eyebrow="Worlds" wide onClose={onClose}>
      <HapticButton
        type="button"
        onClick={onClose}
        className={`absolute right-5 top-5 rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white ${focusRing}`}
        aria-label="Close world select"
      >
        <X className="size-5" strokeWidth={2.2} />
      </HapticButton>
      <ul className="mt-5 grid gap-2.5">
        {DIFFICULTY_ORDER.map((id) => {
          const world = WORLDS[id];
          const config = DIFFICULTIES[id];
          const available = isDifficultyAvailable(progress, id);
          const active = id === current;
          const source = getDifficultyUnlockSource(id);
          const required = getDifficultyUnlockRequirement(id);

          return (
            <li key={id}>
              <HapticButton
                type="button"
                disabled={!available}
                aria-current={active ? "true" : undefined}
                onClick={() => {
                  if (!active) {
                    onChoose(id);
                  }
                  onClose();
                }}
                className={`group relative flex w-full items-center gap-4 overflow-hidden rounded-[1.4rem] border p-3 pr-4 text-left transition duration-200 enabled:hover:-translate-y-0.5 disabled:cursor-not-allowed ${focusRing} ${
                  active ? "border-white/60" : "border-white/12"
                }`}
                style={{
                  background: `linear-gradient(115deg, ${world.day.top} 0%, ${world.day.horizon} 55%, ${world.day.bottom} 100%)`,
                }}
              >
                <span className="absolute inset-0 bg-[linear-gradient(90deg,rgb(0_0_0/0.55),rgb(0_0_0/0.1))]" aria-hidden="true" />
                {!available && <span className="absolute inset-0 bg-black/45 backdrop-grayscale" aria-hidden="true" />}
                <span
                  className="relative grid size-14 shrink-0 place-items-center rounded-2xl text-lg font-bold shadow-[inset_0_-4px_0_rgb(0_0_0/0.2)]"
                  style={{ background: world.crystal, color: world.crystalInk }}
                  aria-hidden="true"
                >
                  {config.size}×{config.size}
                </span>
                <span className="relative min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-lg font-bold">{world.name}</span>
                    <span className="rounded-full bg-black/35 px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white/85">
                      {config.label}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-white/80">
                    {available
                      ? `${world.tagline} · ${progress[id].clearedLevels} cleared`
                      : source
                        ? `Clear ${required} in ${WORLDS[source].name} (${Math.min(progress[source].clearedLevels, required)}/${required})`
                        : world.tagline}
                  </span>
                </span>
                <span className="relative grid size-10 shrink-0 place-items-center rounded-full bg-black/30 text-white">
                  {available ? (
                    <Play className="size-4 fill-current" strokeWidth={2.2} />
                  ) : (
                    <Lock className="size-4" strokeWidth={2.2} />
                  )}
                </span>
              </HapticButton>
            </li>
          );
        })}
      </ul>
    </DialogShell>
  );
}
