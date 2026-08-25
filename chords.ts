// A small curated chord vocabulary in C major, not a chord database. Each
// chord's root sits within a single octave band so pads never jump register.
export type ChordId = "I" | "ii" | "iii" | "IV" | "V" | "V7" | "vi" | "bVII";
export type ChordCategory = "tonic" | "subdominant" | "dominant" | "color";

export interface ChordDef {
  readonly id: ChordId;
  readonly roman: string;
  readonly shortName: string;
  readonly fullName: string;
  readonly category: ChordCategory;
  readonly rootMidi: number;
  readonly intervals: readonly number[];
}

const CHORD_LIST: readonly ChordDef[] = [
  { id: "I", roman: "I", shortName: "C", fullName: "C major", category: "tonic", rootMidi: 60, intervals: [0, 4, 7] },
  { id: "ii", roman: "ii", shortName: "Dm", fullName: "D minor", category: "subdominant", rootMidi: 62, intervals: [0, 3, 7] },
  { id: "iii", roman: "iii", shortName: "Em", fullName: "E minor", category: "color", rootMidi: 64, intervals: [0, 3, 7] },
  { id: "IV", roman: "IV", shortName: "F", fullName: "F major", category: "subdominant", rootMidi: 65, intervals: [0, 4, 7] },
  { id: "V", roman: "V", shortName: "G", fullName: "G major", category: "dominant", rootMidi: 67, intervals: [0, 4, 7] },
  { id: "V7", roman: "V7", shortName: "G7", fullName: "G dominant 7th", category: "dominant", rootMidi: 67, intervals: [0, 4, 7, 10] },
  { id: "vi", roman: "vi", shortName: "Am", fullName: "A minor", category: "tonic", rootMidi: 57, intervals: [0, 3, 7] },
  { id: "bVII", roman: "♭VII", shortName: "B♭", fullName: "B♭ major", category: "color", rootMidi: 58, intervals: [0, 4, 7] },
];

export const CHORDS: Readonly<Record<ChordId, ChordDef>> = Object.fromEntries(
  CHORD_LIST.map((chord) => [chord.id, chord]),
) as Record<ChordId, ChordDef>;

// Hand-curated, not derived: for each chord, every other chord ranked from
// most to least likely to follow it (ordinary pop/jazz tonal harmony —
// ii-V-I, the vi-IV-I-V loop, a bVII "backdoor" resolution, and so on).
// Showing only the top six is what makes the pad row respond to what was
// just played instead of always offering the same set.
const NEXT_CHORD_RANKING: Readonly<Record<ChordId, readonly ChordId[]>> = {
  I: ["V", "IV", "vi", "ii", "V7", "iii", "bVII"],
  ii: ["V", "V7", "vi", "IV", "I", "bVII", "iii"],
  iii: ["vi", "IV", "ii", "I", "V", "V7", "bVII"],
  IV: ["V", "I", "ii", "vi", "V7", "bVII", "iii"],
  V: ["I", "vi", "IV", "V7", "ii", "bVII", "iii"],
  V7: ["I", "vi", "IV", "ii", "V", "bVII", "iii"],
  vi: ["IV", "V", "ii", "I", "V7", "iii", "bVII"],
  bVII: ["IV", "I", "V", "ii", "vi", "V7", "iii"],
};

// The six chords a new player sees before anything has been played. iii and
// bVII are held back so the friendliest chords lead.
const STARTER_CHORDS: readonly ChordId[] = ["I", "IV", "V", "vi", "ii", "V7"];

const PADS_SHOWN = 6;

export function nextChordCandidates(lastPlayed: ChordId | null): ChordDef[] {
  const ids = lastPlayed ? NEXT_CHORD_RANKING[lastPlayed] : STARTER_CHORDS;
  return ids.slice(0, PADS_SHOWN).map((id) => CHORDS[id]);
}

export function midiToFrequency(midiNote: number): number {
  return 440 * 2 ** ((midiNote - 69) / 12);
}
