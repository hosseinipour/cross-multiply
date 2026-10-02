import { useState, type ReactNode } from "react";
import { Moon, Music, RefreshCw, Sun, Volume2, X } from "lucide-react";
import type { ProgressState, SessionState, ThemeMode } from "../appState";
import { sound } from "../audio/sound";
import { useSoundSettings } from "../audio/useSoundSettings";
import { HapticButton } from "../components/HapticButton";
import type { DifficultyId } from "../game";
import { DialogShell } from "./Dialogs";
import { ControlsList, MissionList, ProgressSummary, RuleList } from "./Panels";
import { focusRing } from "./ui";

type Tab = "level" | "progress" | "settings";

function Toggle({
  label,
  icon,
  on,
  onChange,
}: {
  label: string;
  icon: ReactNode;
  on: boolean;
  onChange: () => void;
}) {
  return (
    <HapticButton
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onChange}
      className={`flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10 ${focusRing}`}
    >
      <span className="text-white/70">{icon}</span>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <span
        className={`relative h-6 w-11 rounded-full transition ${on ? "bg-[var(--world-accent)]" : "bg-white/20"}`}
        aria-hidden="true"
      >
        <span
          className={`absolute top-1 size-4 rounded-full bg-white shadow transition-all ${on ? "left-6" : "left-1"}`}
        />
      </span>
    </HapticButton>
  );
}

export function MenuSheet({
  session,
  progress,
  difficulty,
  theme,
  onToggleTheme,
  onReroll,
  onClose,
}: {
  session: SessionState;
  progress: ProgressState;
  difficulty: DifficultyId;
  theme: ThemeMode;
  onToggleTheme: () => void;
  onReroll: () => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>("level");
  const settings = useSoundSettings();
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "level", label: "This level" },
    { id: "progress", label: "Progress" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <DialogShell title="Menu" wide onClose={onClose}>
      <HapticButton
        type="button"
        onClick={onClose}
        className={`absolute right-5 top-5 rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white ${focusRing}`}
        aria-label="Close menu"
      >
        <X className="size-5" strokeWidth={2.2} />
      </HapticButton>

      <div role="tablist" className="mt-5 flex gap-1 rounded-2xl bg-white/6 p-1">
        {tabs.map((item) => (
          <HapticButton
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${focusRing} ${
              tab === item.id
                ? "bg-[var(--world-accent)] text-[var(--world-accent-ink)]"
                : "text-white/70 hover:bg-white/8"
            }`}
          >
            {item.label}
          </HapticButton>
        ))}
      </div>

      <div className="mt-5 max-h-[55vh] space-y-5 overflow-y-auto pr-1 text-left">
        {tab === "level" && (
          <>
            <MissionList session={session} progress={progress} difficulty={difficulty} />
            <RuleList session={session} />
          </>
        )}
        {tab === "progress" && (
          <>
            <ProgressSummary progress={progress} difficulty={difficulty} />
            <ControlsList />
          </>
        )}
        {tab === "settings" && (
          <div className="space-y-2">
            <Toggle
              label="Sound effects"
              icon={<Volume2 className="size-5" strokeWidth={2} />}
              on={settings.sfx}
              onChange={() => {
                sound.unlock();
                sound.update({ sfx: !settings.sfx });
              }}
            />
            <Toggle
              label="Music"
              icon={<Music className="size-5" strokeWidth={2} />}
              on={settings.music}
              onChange={() => {
                sound.unlock();
                sound.update({ music: !settings.music });
              }}
            />
            <Toggle
              label="Night sky"
              icon={theme === "dark" ? <Moon className="size-5" strokeWidth={2} /> : <Sun className="size-5" strokeWidth={2} />}
              on={theme === "dark"}
              onChange={onToggleTheme}
            />
            <HapticButton
              type="button"
              onClick={() => {
                onReroll();
                onClose();
              }}
              className={`flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left hover:bg-white/10 ${focusRing}`}
            >
              <RefreshCw className="size-5 text-white/70" strokeWidth={2} />
              <span className="flex-1 text-sm font-semibold">Shape a new board for this level</span>
            </HapticButton>
          </div>
        )}
      </div>
    </DialogShell>
  );
}
