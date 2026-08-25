// Renders the pad grid, progression strip, and status line, and wires
// mouse/touch (native button activation) and keyboard (digit keys 1-6) to
// the same handler. Talks to state.ts and audio-engine.ts but neither of
// those talks back to the DOM.
import type { AudioEngine } from "./audio-engine.ts";
import { CHORDS, type ChordDef } from "./chords.ts";
import { clearProgression, getCandidates, getProgression, playChordById } from "./state.ts";

// The pad grid refreshes slightly after the press so the glow is visible on
// the pad the player actually touched, instead of vanishing under their
// finger the instant the suggestions change.
const GRID_REFRESH_DELAY_MS = 180;

interface Elements {
  padGrid: HTMLElement;
  progressionList: HTMLOListElement;
  statusLine: HTMLElement;
  clearButton: HTMLButtonElement;
  announcer: HTMLElement;
}

function requireElement<T extends HTMLElement>(root: ParentNode, selector: string): T {
  const el = root.querySelector<T>(selector);
  if (!el) {
    throw new Error(`Missing required element: ${selector}`);
  }
  return el;
}

// Returns an unmount function — unused by main.ts (the page never unmounts
// this), but it keeps repeated mounts in tests from leaking window listeners
// into each other.
export function mountInstrument(root: HTMLElement, engine: AudioEngine): () => void {
  const elements: Elements = {
    padGrid: requireElement(root, "#pad-grid"),
    progressionList: requireElement(root, "#progression-list"),
    statusLine: requireElement(root, "#status-line"),
    clearButton: requireElement(root, "#clear-button"),
    announcer: requireElement(root, "#sr-announcer"),
  };

  let pendingPadRefresh: number | null = null;

  function buildPadButton(chord: ChordDef, index: number, total: number): HTMLButtonElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "pad";
    button.dataset.category = chord.category;
    button.setAttribute(
      "aria-label",
      `Play ${chord.fullName} — chord ${index + 1} of ${total}, keyboard shortcut ${index + 1}`,
    );

    const key = document.createElement("span");
    key.className = "pad__key";
    key.textContent = String(index + 1);

    const name = document.createElement("span");
    name.className = "pad__name";
    name.textContent = chord.shortName;

    const roman = document.createElement("span");
    roman.className = "pad__roman";
    roman.textContent = chord.roman;

    button.append(key, name, roman);
    button.addEventListener("click", () => handlePlay(chord, button));
    return button;
  }

  function renderPads(): void {
    const candidates = getCandidates();
    elements.padGrid.replaceChildren(
      ...candidates.map((chord, index) => buildPadButton(chord, index, candidates.length)),
    );
  }

  function buildProgressionChip(chord: ChordDef, isLatest: boolean): HTMLLIElement {
    const item = document.createElement("li");
    item.className = isLatest ? "chip chip--latest" : "chip";
    item.textContent = chord.shortName;
    return item;
  }

  function renderProgressionAndStatus(): void {
    const progression = getProgression();
    if (progression.length === 0) {
      const hint = document.createElement("li");
      hint.className = "chip chip--hint";
      hint.textContent = "Press a chord below to begin.";
      elements.progressionList.replaceChildren(hint);
    } else {
      elements.progressionList.replaceChildren(
        ...progression.map((id, index) => buildProgressionChip(CHORDS[id], index === progression.length - 1)),
      );
      // jsdom (used by spec/pads.test.ts) doesn't implement scrollIntoView.
      elements.progressionList.lastElementChild?.scrollIntoView?.({ block: "nearest" });
    }
    const played = progression.length === 1 ? "1 chord played" : `${progression.length} chords played`;
    elements.statusLine.textContent = `Key of C major · ${played} · press 1–6, click, or tap a pad`;
  }

  function announce(chord: ChordDef): void {
    const next = getCandidates()
      .map((candidate) => candidate.shortName)
      .join(", ");
    elements.announcer.textContent = `Played ${chord.fullName}. Next chords: ${next}.`;
  }

  function handlePlay(chord: ChordDef, sourceButton: HTMLButtonElement | null): void {
    engine.playChord(chord);
    playChordById(chord.id);
    renderProgressionAndStatus();
    announce(chord);

    sourceButton?.classList.add("pad--playing");

    if (pendingPadRefresh !== null) {
      window.clearTimeout(pendingPadRefresh);
    }
    pendingPadRefresh = window.setTimeout(() => {
      renderPads();
      pendingPadRefresh = null;
    }, GRID_REFRESH_DELAY_MS);
  }

  function handleKeydown(event: KeyboardEvent): void {
    if (event.repeat || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }
    const index = Number(event.key) - 1;
    if (!Number.isInteger(index) || index < 0 || index > 5) {
      return;
    }
    const button = elements.padGrid.children.item(index);
    const chord = getCandidates()[index];
    if (!(button instanceof HTMLButtonElement) || !chord) {
      return;
    }
    handlePlay(chord, button);
  }

  elements.clearButton.addEventListener("click", () => {
    clearProgression();
    renderProgressionAndStatus();
    renderPads();
    elements.announcer.textContent = "Progression cleared.";
  });

  window.addEventListener("keydown", handleKeydown);

  renderPads();
  renderProgressionAndStatus();

  return () => window.removeEventListener("keydown", handleKeydown);
}
