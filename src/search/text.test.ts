import { describe, expect, it } from "vitest";
import { marked, words } from "./text";

describe("words (design.md 15.2, Q14)", () => {
  it("folds accents and case and splits on everything outside a-z and 0-9", () => {
    expect(words("171 Å, the same view")).toEqual(["171", "a", "the", "same", "view"]);
    expect(words("Andromeda Galaxy (M31), Hubble PHAT+PHAST panorama")).toEqual(["andromeda", "galaxy", "m31", "hubble", "phat", "phast", "panorama"]);
    expect(words("  Café–crème  ")).toEqual(["cafe", "creme"]);
    expect(words("")).toEqual([]);
  });
});

describe("marked (Q19)", () => {
  it("marks the matched prefix of each word, keeping the text as written", () => {
    expect(marked("Satellite galaxy M32", ["m3"])).toEqual([
      { text: "Satellite galaxy ", strong: false },
      { text: "M3", strong: true },
      { text: "2", strong: false },
    ]);
  });

  it("maps a folded letter back to the character typed in the data", () => {
    expect(marked("171 Å, the same view", ["171", "a"])).toEqual([
      { text: "171", strong: true },
      { text: " ", strong: false },
      { text: "Å", strong: true },
      { text: ", the same view", strong: false },
    ]);
  });

  it("takes the longest query word that prefixes a word", () => {
    expect(marked("Andromeda core", ["a", "andro"])).toEqual([
      { text: "Andro", strong: true },
      { text: "meda core", strong: false },
    ]);
  });

  it("marks nothing without a match", () => {
    expect(marked("NGC 206", [])).toEqual([{ text: "NGC 206", strong: false }]);
  });
});
