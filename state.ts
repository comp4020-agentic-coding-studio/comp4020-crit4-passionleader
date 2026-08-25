// Progression state, kept apart from the DOM so future controls (tempo,
// save slots) can read and write it without touching rendering code.
import { type ChordId, type RankedChord, rankNextChords } from "./chords.ts";

let progression: ChordId[] = [];
let candidates: RankedChord[] = rankNextChords(progression);

export function getProgression(): readonly ChordId[] {
  return progression;
}

export function getCandidates(): readonly RankedChord[] {
  return candidates;
}

export function playChordById(id: ChordId): void {
  progression = [...progression, id];
  candidates = rankNextChords(progression);
}

export function clearProgression(): void {
  progression = [];
  candidates = rankNextChords(progression);
}
