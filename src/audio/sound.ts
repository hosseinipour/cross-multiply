import type { WorldTheme } from "../scene/worlds";

export type SoundSettings = { sfx: boolean; music: boolean };

export type SoundName =
  | "select"
  | "erase"
  | "autoClear"
  | "lineMatched"
  | "miss"
  | "blocked"
  | "hint"
  | "unlock"
  | "win"
  | "lose"
  | "levelStart"
  | "click"
  | "toggle";

const SETTINGS_KEY = "cross-multiply-audio-v1";
const SFX_LEVEL = 0.55;
const MUSIC_LEVEL = 0.32;

type Voice = {
  type?: OscillatorType;
  attack?: number;
  decay?: number;
  gain?: number;
  glideTo?: number;
  detune?: number;
  reverb?: number;
  filter?: number;
};

function midiToFreq(midi: number) {
  return 440 * 2 ** ((midi - 69) / 12);
}

function loadSettings(): SoundSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<SoundSettings>) : {};
    return { sfx: parsed.sfx !== false, music: parsed.music !== false };
  } catch {
    return { sfx: true, music: true };
  }
}

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private reverbSend: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private world: WorldTheme | null = null;
  private schedulerId: number | null = null;
  private nextBeat = 0;
  private beat = 0;
  private listeners = new Set<() => void>();
  settings: SoundSettings =
    typeof window === "undefined" ? { sfx: true, music: true } : loadSettings();

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSettings = () => this.settings;

  update(patch: Partial<SoundSettings>) {
    this.settings = { ...this.settings, ...patch };

    try {
      window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {
      // Storage can be unavailable; audio still follows the in-memory setting.
    }

    if (this.ctx && this.musicBus && this.sfxBus) {
      const now = this.ctx.currentTime;
      this.musicBus.gain.setTargetAtTime(
        this.settings.music ? MUSIC_LEVEL : 0,
        now,
        0.4,
      );
      this.sfxBus.gain.setTargetAtTime(this.settings.sfx ? SFX_LEVEL : 0, now, 0.05);
    }

    this.syncScheduler();
    this.listeners.forEach((listener) => listener());
  }

  /** Browsers only allow audio after a gesture, so this runs on first input. */
  unlock() {
    if (typeof window === "undefined") {
      return;
    }

    if (!this.ctx) {
      const AudioCtor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      if (!AudioCtor) {
        return;
      }

      this.ctx = new AudioCtor();
      this.build(this.ctx);
    }

    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }

    this.syncScheduler();
  }

  setPaused(paused: boolean) {
    if (!this.ctx) {
      return;
    }

    if (paused) {
      void this.ctx.suspend();
    } else {
      void this.ctx.resume();
    }
  }

  setWorld(world: WorldTheme) {
    this.world = world;
  }

  private build(ctx: AudioContext) {
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.ratio.value = 4;
    this.master.connect(compressor).connect(ctx.destination);

    this.sfxBus = ctx.createGain();
    this.sfxBus.gain.value = this.settings.sfx ? SFX_LEVEL : 0;
    this.sfxBus.connect(this.master);

    this.musicBus = ctx.createGain();
    this.musicBus.gain.value = this.settings.music ? MUSIC_LEVEL : 0;
    this.musicBus.connect(this.master);

    // A generated hall impulse keeps the build asset-free.
    const length = Math.floor(ctx.sampleRate * 2.6);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let index = 0; index < length; index += 1) {
        data[index] = (Math.random() * 2 - 1) * (1 - index / length) ** 3.2;
      }
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = impulse;
    this.reverbSend = ctx.createGain();
    this.reverbSend.gain.value = 0.9;
    this.reverbSend.connect(convolver).connect(this.master);

    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const noiseData = this.noise.getChannelData(0);
    for (let index = 0; index < noiseData.length; index += 1) {
      noiseData[index] = Math.random() * 2 - 1;
    }
  }

  private syncScheduler() {
    const shouldRun = Boolean(this.ctx && this.settings.music);

    if (shouldRun && this.schedulerId === null && this.ctx) {
      this.nextBeat = this.ctx.currentTime + 0.2;
      this.schedulerId = window.setInterval(() => this.scheduleMusic(), 120);
    } else if (!shouldRun && this.schedulerId !== null) {
      window.clearInterval(this.schedulerId);
      this.schedulerId = null;
    }
  }

  private tone(
    bus: AudioNode,
    freq: number,
    when: number,
    {
      type = "sine",
      attack = 0.005,
      decay = 0.3,
      gain = 0.3,
      glideTo,
      detune = 0,
      reverb = 0.2,
      filter,
    }: Voice = {},
  ) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, when);
    osc.detune.value = detune;

    if (glideTo) {
      osc.frequency.exponentialRampToValueAtTime(glideTo, when + decay * 0.8);
    }

    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(gain, when + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, when + attack + decay);

    let head: AudioNode = osc;
    if (filter) {
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = filter;
      osc.connect(lowpass);
      head = lowpass;
    }

    head.connect(env);
    env.connect(bus);

    if (reverb > 0 && this.reverbSend) {
      const send = ctx.createGain();
      send.gain.value = reverb;
      env.connect(send).connect(this.reverbSend);
    }

    osc.start(when);
    osc.stop(when + attack + decay + 0.05);
  }

  private burst(
    when: number,
    {
      duration = 0.12,
      gain = 0.2,
      type = "bandpass",
      from = 1200,
      to,
      q = 1,
      reverb = 0.1,
    }: {
      duration?: number;
      gain?: number;
      type?: BiquadFilterType;
      from?: number;
      to?: number;
      q?: number;
      reverb?: number;
    } = {},
  ) {
    const ctx = this.ctx!;
    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    // Bursts can outlast the one-second buffer from a random offset.
    source.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.Q.value = q;
    filter.frequency.setValueAtTime(from, when);
    if (to) {
      filter.frequency.exponentialRampToValueAtTime(to, when + duration);
    }
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, when);
    env.gain.linearRampToValueAtTime(gain, when + Math.min(0.02, duration / 3));
    env.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    source.connect(filter).connect(env).connect(this.sfxBus!);

    if (reverb > 0 && this.reverbSend) {
      const send = ctx.createGain();
      send.gain.value = reverb;
      env.connect(send).connect(this.reverbSend);
    }

    source.start(when, Math.random() * 0.5);
    source.stop(when + duration + 0.05);
  }

  private scaleNote(step: number, octaveOffset = 1) {
    const world = this.world;
    const root = world?.music.root ?? 60;
    const scale = world?.music.scale ?? [0, 2, 4, 7, 9];
    const octave = Math.floor(step / scale.length);
    const degree = ((step % scale.length) + scale.length) % scale.length;
    return midiToFreq(root + 12 * (octaveOffset + octave) + scale[degree]);
  }

  play(name: SoundName, options: { streak?: number; delayMs?: number } = {}) {
    if (!this.ctx || !this.sfxBus || !this.settings.sfx) {
      return;
    }

    const bus = this.sfxBus;
    const t = this.ctx.currentTime + (options.delayMs ?? 0) / 1000 + 0.005;

    switch (name) {
      case "select": {
        // Every correct pick in a row climbs the world's scale.
        const step = Math.min(options.streak ?? 0, 14);
        const freq = this.scaleNote(step, 0);
        this.tone(bus, freq, t, { type: "triangle", decay: 0.45, gain: 0.32, reverb: 0.25 });
        this.tone(bus, freq * 2, t, { decay: 0.3, gain: 0.12, reverb: 0.3 });
        this.tone(bus, freq * 3.01, t + 0.01, { decay: 0.18, gain: 0.05, reverb: 0.4 });
        break;
      }
      case "erase":
        this.tone(bus, 190, t, { decay: 0.16, gain: 0.32, glideTo: 80, reverb: 0.05 });
        this.burst(t, { duration: 0.14, gain: 0.22, type: "lowpass", from: 1400, to: 300 });
        break;
      case "autoClear":
        this.burst(t, {
          duration: 0.09,
          gain: 0.12,
          from: 1800 + Math.random() * 900,
          q: 3,
          reverb: 0.05,
        });
        this.tone(bus, 140 + Math.random() * 40, t, { decay: 0.1, gain: 0.12, glideTo: 70, reverb: 0 });
        break;
      case "lineMatched": {
        const chord = [0, 2, 4, 7].map((step) => this.scaleNote(step, 1));
        chord.forEach((freq, index) => {
          const at = t + index * 0.045;
          this.tone(bus, freq, at, { decay: 1.3, gain: 0.14, reverb: 0.55 });
          this.tone(bus, freq * 2.01, at, { decay: 0.7, gain: 0.05, reverb: 0.6 });
        });
        this.burst(t + 0.05, { duration: 0.6, gain: 0.06, type: "highpass", from: 5000, reverb: 0.5 });
        break;
      }
      case "miss":
        this.tone(bus, 116, t, { type: "sawtooth", decay: 0.32, gain: 0.22, glideTo: 62, filter: 700, reverb: 0.1 });
        this.tone(bus, 123, t, { type: "sawtooth", decay: 0.32, gain: 0.18, glideTo: 66, filter: 700, reverb: 0.1 });
        this.burst(t, { duration: 0.22, gain: 0.3, type: "lowpass", from: 500, to: 90 });
        break;
      case "blocked":
        this.tone(bus, 240, t, { type: "square", decay: 0.07, gain: 0.07, filter: 900, reverb: 0 });
        this.tone(bus, 180, t + 0.07, { type: "square", decay: 0.09, gain: 0.06, filter: 900, reverb: 0 });
        break;
      case "hint":
        [0, 2, 4, 6, 8].forEach((step, index) =>
          this.tone(bus, this.scaleNote(step, 1), t + index * 0.06, {
            decay: 0.6,
            gain: 0.1,
            reverb: 0.6,
          }),
        );
        break;
      case "unlock":
        this.tone(bus, this.scaleNote(0, 1), t, { decay: 0.5, gain: 0.16, reverb: 0.5 });
        this.tone(bus, this.scaleNote(3, 1), t + 0.12, { decay: 0.8, gain: 0.16, reverb: 0.5 });
        break;
      case "win": {
        [0, 2, 4, 5, 7, 9].forEach((step, index) => {
          const freq = this.scaleNote(step, 1);
          this.tone(bus, freq, t + index * 0.09, { type: "triangle", decay: 0.5, gain: 0.16, reverb: 0.5 });
          this.tone(bus, freq * 2, t + index * 0.09, { decay: 0.4, gain: 0.06, reverb: 0.6 });
        });
        [0, 2, 4, 7].forEach((step) =>
          this.tone(bus, this.scaleNote(step, 1), t + 0.6, { attack: 0.03, decay: 2.2, gain: 0.12, reverb: 0.7 }),
        );
        this.burst(t + 0.55, { duration: 1.4, gain: 0.08, type: "highpass", from: 3000, reverb: 0.7 });
        break;
      }
      case "lose":
        [4, 3, 1, 0].forEach((step, index) =>
          this.tone(bus, this.scaleNote(step, 0), t + index * 0.22, {
            type: "triangle",
            decay: 0.55,
            gain: 0.18,
            filter: 1400,
            reverb: 0.5,
          }),
        );
        break;
      case "levelStart":
        this.burst(t, { duration: 0.7, gain: 0.16, from: 250, to: 3200, q: 2, reverb: 0.4 });
        this.tone(bus, 70, t + 0.45, { decay: 0.6, gain: 0.3, glideTo: 45, reverb: 0.2 });
        break;
      case "click":
        this.tone(bus, 1250, t, { decay: 0.035, gain: 0.07, reverb: 0 });
        break;
      case "toggle":
        this.tone(bus, 880, t, { decay: 0.05, gain: 0.07, reverb: 0 });
        this.tone(bus, 1320, t + 0.05, { decay: 0.06, gain: 0.06, reverb: 0 });
        break;
    }
  }

  /** A slow pad, a soft bass, and sparse bell notes that follow the world. */
  private scheduleMusic() {
    const ctx = this.ctx;
    const bus = this.musicBus;
    const world = this.world;

    if (!ctx || !bus || !world || ctx.state !== "running") {
      return;
    }

    const beatLength = 60 / world.music.tempo;

    // After a main-thread stall, resume on the beat instead of replaying it.
    if (this.nextBeat < ctx.currentTime) {
      this.nextBeat = ctx.currentTime + 0.05;
    }

    while (this.nextBeat < ctx.currentTime + 0.4) {
      const when = this.nextBeat;
      const bar = Math.floor(this.beat / 4);
      const chord = world.music.chords[bar % world.music.chords.length];
      const root = world.music.root;

      if (this.beat % 4 === 0) {
        const barLength = beatLength * 4;
        for (const offset of chord) {
          for (const detune of [-7, 7]) {
            this.tone(bus, midiToFreq(root + offset), when, {
              type: "triangle",
              attack: barLength * 0.45,
              decay: barLength * 0.9,
              gain: 0.035,
              detune,
              filter: 1100,
              reverb: 0.8,
            });
          }
        }
        this.tone(bus, midiToFreq(root - 12 + chord[0]), when, {
          attack: 0.4,
          decay: barLength * 0.95,
          gain: 0.09,
          reverb: 0.2,
        });
      }

      if (Math.random() < 0.38) {
        const step = Math.floor(Math.random() * world.music.scale.length * 2);
        this.tone(bus, this.scaleNote(step, 1), when + (Math.random() < 0.3 ? beatLength / 2 : 0), {
          decay: 1.4,
          gain: 0.045,
          reverb: 0.9,
        });
      }

      this.beat += 1;
      this.nextBeat += beatLength;
    }
  }
}

export const sound = new SoundEngine();
