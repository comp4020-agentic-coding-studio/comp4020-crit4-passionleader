// Progression state, kept apart from the DOM so future controls (tempo,
// save slots) can read and write it without touching rendering code.
import { type ChordDef, type ChordId, nextChordCandidates } from "./chords.ts";

let progression: ChordId[] = [];
let candidates: ChordDef[] = nextChordCandidates(null);

export function getProgression(): readonly ChordId[] {
  return progression;
}

export function getCandidates(): readonly ChordDef[] {
  return candidates;
}

export function playChordById(id: ChordId): void {
  progression = [...progression, id];
  candidates = nextChordCandidates(id);
}

export function clearProgression(): void {
  progression = [];
  candidates = nextChordCandidates(null);
}
