import { describe, expect, it } from "vitest";
import { CHORDS, type ChordId, nextChordCandidates } from "../chords.ts";

const ALL_IDS = Object.keys(CHORDS) as ChordId[];

describe("nextChordCandidates", () => {
  it("always offers exactly six chords, from the empty state too", () => {
    expect(nextChordCandidates(null)).toHaveLength(6);
    for (const id of ALL_IDS) {
      expect(nextChordCandidates(id)).toHaveLength(6);
    }
  });

  it("never suggests the chord that was just played", () => {
    for (const id of ALL_IDS) {
      const candidates = nextChordCandidates(id);
      expect(candidates.some((chord) => chord.id === id)).toBe(false);
    }
  });

  it("never repeats a chord within one set of suggestions", () => {
    for (const id of [null, ...ALL_IDS]) {
      const candidates = nextChordCandidates(id);
      expect(new Set(candidates.map((chord) => chord.id)).size).toBe(candidates.length);
    }
  });

  it("changes what it suggests based on what was just played", () => {
    const afterI = nextChordCandidates("I").map((chord) => chord.id);
    const afterVi = nextChordCandidates("vi").map((chord) => chord.id);
    expect(afterI).not.toEqual(afterVi);
  });

  it("is deterministic for the same input", () => {
    expect(nextChordCandidates("V")).toEqual(nextChordCandidates("V"));
  });
});
