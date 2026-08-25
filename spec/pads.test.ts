// @vitest-environment jsdom
//
// Drives ui.ts against a stub AudioEngine (jsdom has no Web Audio API) to
// test the actual contract: pressing a pad plays a chord, extends the
// progression, and reshuffles the suggestions — by mouse click or keyboard.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AudioEngine } from "../audio-engine.ts";
import { clearProgression } from "../state.ts";
import { mountInstrument } from "../ui.ts";

let unmount: (() => void) | null = null;

function mount() {
  document.body.innerHTML = `
    <div class="app">
      <button id="clear-button" type="button">Clear</button>
      <div id="pad-grid"></div>
      <ol id="progression-list"></ol>
      <p id="status-line"></p>
      <p id="sr-announcer"></p>
    </div>
  `;
  const root = document.querySelector<HTMLElement>(".app");
  if (!root) {
    throw new Error("test root missing");
  }
  const engine = { playChord: vi.fn() } as unknown as AudioEngine;
  unmount = mountInstrument(root, engine);
  return { engine, root };
}

describe("Chord Session pads", () => {
  beforeEach(() => {
    clearProgression();
    vi.useFakeTimers();
  });

  afterEach(() => {
    unmount?.();
    unmount = null;
    vi.useRealTimers();
  });

  it("shows exactly six chord pads as real, labelled buttons", () => {
    const { root } = mount();
    const pads = root.querySelectorAll<HTMLButtonElement>("#pad-grid button");
    expect(pads).toHaveLength(6);
    for (const pad of pads) {
      expect(pad.type).toBe("button");
      expect(pad.getAttribute("aria-label")).toBeTruthy();
    }
  });

  it("plays a live chord and adds it to the progression on click", () => {
    const { root, engine } = mount();
    root.querySelector<HTMLButtonElement>("#pad-grid button")?.click();

    expect(engine.playChord).toHaveBeenCalledTimes(1);
    expect(root.querySelector("#progression-list .chip--latest")?.textContent).toBeTruthy();
    expect(root.querySelector("#status-line")?.textContent).toContain("1 chord played");
  });

  it("responds to the same pad through the keyboard", () => {
    const { root, engine } = mount();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "2" }));

    expect(engine.playChord).toHaveBeenCalledTimes(1);
    expect(root.querySelector("#status-line")?.textContent).toContain("1 chord played");
  });

  it("ignores keys outside the six visible pads", () => {
    const { engine } = mount();
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "7" }));
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "0" }));

    expect(engine.playChord).not.toHaveBeenCalled();
  });

  it("reshuffles the pad suggestions shortly after a chord plays", () => {
    const { root } = mount();
    const before = [...root.querySelectorAll<HTMLButtonElement>("#pad-grid button")].map((button) =>
      button.getAttribute("aria-label"),
    );

    root.querySelector<HTMLButtonElement>("#pad-grid button")?.click();
    vi.advanceTimersByTime(200);

    const after = [...root.querySelectorAll<HTMLButtonElement>("#pad-grid button")].map((button) =>
      button.getAttribute("aria-label"),
    );
    expect(after).toHaveLength(6);
    expect(after).not.toEqual(before);
  });

  it("clears the progression back to the starter prompt", () => {
    const { root } = mount();
    root.querySelector<HTMLButtonElement>("#pad-grid button")?.click();
    vi.advanceTimersByTime(200);

    root.querySelector<HTMLButtonElement>("#clear-button")?.click();

    expect(root.querySelector("#progression-list .chip--hint")).toBeTruthy();
    expect(root.querySelector("#status-line")?.textContent).toContain("0 chords played");
  });
});
