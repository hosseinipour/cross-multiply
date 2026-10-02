import { useSyncExternalStore } from "react";
import { sound } from "./sound";

export function useSoundSettings() {
  return useSyncExternalStore(
    (listener) => sound.subscribe(listener),
    sound.getSettings,
    sound.getSettings,
  );
}
