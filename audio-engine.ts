// The only module that touches the Web Audio API. Chord data and UI
// rendering both stay ignorant of how sound is produced, so a future voice
// (drums, arpeggios) can schedule through this same context without touching
// button code.
import { type ChordDef, midiToFrequency, voiceChordTones } from "./chords.ts";

type AudioContextConstructor = typeof AudioContext;

function resolveAudioContextConstructor(): AudioContextConstructor {
  const globalWindow = window as typeof window & { webkitAudioContext?: AudioContextConstructor };
  const ctor = globalWindow.AudioContext ?? globalWindow.webkitAudioContext;
  if (!ctor) {
    throw new Error("This browser does not support the Web Audio API.");
  }
  return ctor;
}

const BASS_OCTAVE_DROP = 24;
const MASTER_GAIN = 0.5;

interface VoiceShape {
  readonly attack: number;
  readonly decay: number;
  readonly peak: number;
}

const PIANO_SHAPE: VoiceShape = { attack: 0.006, decay: 1.1, peak: 0.34 };
const BASS_SHAPE: VoiceShape = { attack: 0.008, decay: 1.3, peak: 0.5 };

export class AudioEngine {
  #context: AudioContext | null = null;
  #master: GainNode | null = null;
  #lastVoicing: number[] | null = null;

  playChord(chord: ChordDef): void {
    const { context, master } = this.#ensureGraph();
    const startAt = context.currentTime;
    const voicing = voiceChordTones(chord, this.#lastVoicing);
    this.#lastVoicing = voicing;
    for (const note of voicing) {
      this.#playVoice(context, master, midiToFrequency(note), startAt, PIANO_SHAPE, true);
    }
    this.#playVoice(context, master, midiToFrequency(chord.rootMidi - BASS_OCTAVE_DROP), startAt, BASS_SHAPE, false);
  }

  // Call when the progression is cleared so the next chord voices in plain
  // root position instead of leading smoothly from an abandoned progression.
  reset(): void {
    this.#lastVoicing = null;
  }

  #ensureGraph(): { context: AudioContext; master: GainNode } {
    if (!this.#context || !this.#master) {
      const Ctor = resolveAudioContextConstructor();
      const context = new Ctor();
      const master = context.createGain();
      master.gain.value = MASTER_GAIN;
      const compressor = context.createDynamicsCompressor();
      master.connect(compressor);
      compressor.connect(context.destination);
      this.#context = context;
      this.#master = master;
    }
    if (this.#context.state === "suspended") {
      void this.#context.resume();
    }
    return { context: this.#context, master: this.#master };
  }

  // `brightnessDecay` gives the piano voice a struck-string character: the
  // filter opens on the attack, then closes over the decay. The bass voice
  // stays warm and steady instead.
  #playVoice(
    context: AudioContext,
    destination: AudioNode,
    frequency: number,
    startAt: number,
    shape: VoiceShape,
    brightnessDecay: boolean,
  ): void {
    const { attack, decay, peak } = shape;
    const releaseAt = startAt + attack + decay;
    const stopAt = releaseAt + 0.05;

    const voiceGain = context.createGain();
    voiceGain.gain.setValueAtTime(0, startAt);
    voiceGain.gain.linearRampToValueAtTime(peak, startAt + attack);
    voiceGain.gain.exponentialRampToValueAtTime(0.001, releaseAt);
    voiceGain.gain.setValueAtTime(0, releaseAt + 0.02);

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    if (brightnessDecay) {
      filter.frequency.setValueAtTime(4200, startAt);
      filter.frequency.exponentialRampToValueAtTime(900, releaseAt);
    } else {
      filter.frequency.value = 700;
    }

    voiceGain.connect(filter);
    filter.connect(destination);

    const detunes = brightnessDecay ? [0, 4] : [0];
    for (const detune of detunes) {
      const osc = context.createOscillator();
      osc.type = detune === 0 ? "triangle" : "sine";
      osc.frequency.setValueAtTime(frequency, startAt);
      osc.detune.setValueAtTime(detune, startAt);
      osc.connect(voiceGain);
      osc.start(startAt);
      osc.stop(stopAt);
      osc.onended = () => osc.disconnect();
    }

    window.setTimeout(
      () => {
        voiceGain.disconnect();
        filter.disconnect();
      },
      (stopAt - startAt) * 1000 + 50,
    );
  }
}
