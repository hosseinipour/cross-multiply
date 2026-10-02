export type Vec = [number, number, number];

export type SparkOptions = {
  count?: number;
  speed?: number;
  /** Upward bias added to every particle. */
  lift?: number;
  spread?: number;
  size?: number;
  life?: number;
  gravity?: number;
  colors?: string[];
};

export type EffectsApi = {
  sparks: (position: Vec, options?: SparkOptions) => void;
  debris: (position: Vec, color: string, count?: number) => void;
  beam: (position: Vec, color: string, height?: number) => void;
  ring: (position: Vec, color: string, size?: number) => void;
  sweep: (from: Vec, to: Vec, color: string) => void;
};

let api: EffectsApi | null = null;

/** Called by the mounted <Effects /> pool; returns the unregister function. */
export function registerEffects(next: EffectsApi) {
  api = next;
  return () => {
    if (api === next) {
      api = null;
    }
  };
}

/** Imperative entry points so any scene object can spawn a burst. */
export const fx: EffectsApi = {
  sparks: (...args) => api?.sparks(...args),
  debris: (...args) => api?.debris(...args),
  beam: (...args) => api?.beam(...args),
  ring: (...args) => api?.ring(...args),
  sweep: (...args) => api?.sweep(...args),
};
