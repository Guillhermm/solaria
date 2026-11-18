import { describe, expect, it } from "vitest";
import {
  bandValueText,
  blend,
  stopBand,
  crossfade,
  lightParams,
  nearestStop,
  parseLightParams,
  positionFromPointer,
  preloaded,
  railKey,
  stopCenter,
  wavelengthLabel,
} from "./light";

const OPTS = {
  sets: [
    { id: "sun", imageIds: ["aia-94", "aia-171", "aia-304"] },
    { id: "other", imageIds: ["x", "y"] },
  ],
};

describe("parseLightParams", () => {
  it("reads the set and the band by image id", () => {
    expect(parseLightParams("?mode=light&band=aia-171", OPTS)).toEqual({ set: "sun", band: 1 });
    expect(parseLightParams("?mode=light&set=other&band=y", OPTS)).toEqual({ set: "other", band: 1 });
  });

  it("falls back to the first set and its first band", () => {
    expect(parseLightParams("", OPTS)).toEqual({ set: "sun", band: 0 });
    expect(parseLightParams("?set=nope&band=aia-304", OPTS)).toEqual({ set: "sun", band: 2 });
    expect(parseLightParams("?band=y", OPTS)).toEqual({ set: "sun", band: 0 });
    expect(parseLightParams("?band=<script>", OPTS)).toEqual({ set: "sun", band: 0 });
  });
});

describe("lightParams", () => {
  it("leaves the defaults out", () => {
    expect(lightParams({ set: "sun", band: 0 }, OPTS)).toEqual([]);
    expect(lightParams({ set: "sun", band: 2 }, OPTS)).toEqual([["band", "aia-304"]]);
    expect(lightParams({ set: "other", band: 0 }, OPTS)).toEqual([["set", "other"]]);
  });

  it("round-trips through the parser", () => {
    for (const set of OPTS.sets) {
      set.imageIds.forEach((_, band) => {
        const search = `?${new URLSearchParams(lightParams({ set: set.id, band }, OPTS))}`;
        expect(parseLightParams(search, OPTS)).toEqual({ set: set.id, band });
      });
    }
  });

  it("writes nothing for an unknown set or band", () => {
    expect(lightParams({ set: "nope", band: 1 }, OPTS)).toEqual([]);
    expect(lightParams({ set: "sun", band: 9 }, OPTS)).toEqual([]);
  });
});

describe("crossfade", () => {
  it("shows one band at a stop", () => {
    expect(crossfade(0, 3)).toEqual([1, 0, 0]);
    expect(crossfade(1, 3)).toEqual([0, 1, 0]);
    expect(crossfade(2, 3)).toEqual([0, 0, 1]);
  });

  it("fades the upper band of the pair in over the lower one", () => {
    expect(crossfade(0.25, 3)).toEqual([1, 0.25, 0]);
    expect(crossfade(1.75, 3)).toEqual([0, 1, 0.75]);
  });

  it("gives the exact mix (1 - t) A + t B on screen", () => {
    for (const p of [0.1, 0.5, 0.9, 1.3]) {
      const o = crossfade(p, 3);
      const lower = Math.floor(p);
      const t = p - lower;
      // The upper band at opacity t over the opaque lower one.
      const weightLower = o[lower] * (1 - o[lower + 1]);
      expect(weightLower).toBeCloseTo(1 - t, 12);
      expect(o[lower + 1]).toBeCloseTo(t, 12);
      expect(o.filter((_, i) => i !== lower && i !== lower + 1).every((v) => v === 0)).toBe(true);
    }
  });

  it("clamps positions off the rail", () => {
    expect(crossfade(-1, 3)).toEqual([1, 0, 0]);
    expect(crossfade(7, 3)).toEqual([0, 0, 1]);
  });
});

describe("preloaded", () => {
  it("keeps the neighbors of the position loading", () => {
    expect(preloaded(0, 4)).toEqual([true, true, false, false]);
    expect(preloaded(1.5, 4)).toEqual([true, true, true, true]);
    expect(preloaded(3, 4)).toEqual([false, false, true, true]);
  });
});

describe("rail geometry", () => {
  it("puts stops at the middle of equal columns", () => {
    expect([0, 1, 2, 3].map((i) => stopCenter(i, 4))).toEqual([0.125, 0.375, 0.625, 0.875]);
  });

  it("maps the pointer to a position, stop centers to whole numbers", () => {
    const box = { left: 100, width: 400 };
    expect(positionFromPointer(150, box, 4)).toBe(0);
    expect(positionFromPointer(350, box, 4)).toBe(2);
    expect(positionFromPointer(300, box, 4)).toBe(1.5);
    expect(positionFromPointer(0, box, 4)).toBe(0);
    expect(positionFromPointer(900, box, 4)).toBe(3);
  });

  it("settles a release on the nearest stop", () => {
    expect(nearestStop(1.49, 4)).toBe(1);
    expect(nearestStop(1.5, 4)).toBe(2);
    expect(nearestStop(-2, 4)).toBe(0);
    expect(nearestStop(9, 4)).toBe(3);
  });
});

describe("railKey", () => {
  it("moves one band per key and stops at the ends", () => {
    expect(railKey("ArrowRight", 1, 3)).toBe(2);
    expect(railKey("ArrowUp", 2, 3)).toBe(2);
    expect(railKey("ArrowLeft", 1, 3)).toBe(0);
    expect(railKey("ArrowDown", 0, 3)).toBe(0);
    expect(railKey("PageUp", 0, 3)).toBe(1);
    expect(railKey("PageDown", 2, 3)).toBe(1);
    expect(railKey("Home", 2, 3)).toBe(0);
    expect(railKey("End", 0, 3)).toBe(2);
    expect(railKey("a", 0, 3)).toBeNull();
  });
});

describe("band text", () => {
  it("states the wavelength in the manifest's unit", () => {
    expect(wavelengthLabel({ id: "AIA 171", wavelength: { value: 171, unit: "Å" } })).toBe("171 Å");
    expect(wavelengthLabel({ id: "F475W", wavelength: { value: 475, unit: "nm" } })).toBe("475 nm");
    expect(wavelengthLabel({ id: "AIA 171" })).toBe("AIA 171");
  });

  it("speaks the unit and the region", () => {
    expect(bandValueText({ id: "AIA 171", wavelength: { value: 171, unit: "Å" }, region: "extreme ultraviolet" })).toBe(
      "171 angstroms, extreme ultraviolet",
    );
    expect(bandValueText({ id: "HMI", wavelength: { value: 6173, unit: "Å" } })).toBe("6173 angstroms");
    expect(bandValueText({ id: "F", wavelength: { value: 1, unit: "µm" } })).toBe("1 micrometer");
    expect(bandValueText({ id: "F", wavelength: { value: 2.5, unit: "nm" }, region: "x" })).toBe("2.5 nanometers, x");
    expect(bandValueText({ id: "AIA 171" })).toBe("AIA 171");
  });
});

describe("blend", () => {
  const screen = (o: number[], from: number, to: number) => {
    // Stacked in index order: each band covers what is below it by its opacity.
    const w = o.map(() => 0);
    o.forEach((a, i) => {
      for (let j = 0; j < i; j++) w[j] *= 1 - a;
      w[i] = a;
    });
    return [w[from], w[to], w.reduce((s, v, i) => (i === from || i === to ? s : s + v), 0)];
  };

  it("mixes any two bands as (1 - t) from + t to, up or down the stack", () => {
    for (const [from, to] of [[6, 4], [4, 6], [0, 3], [3, 1]]) {
      for (const t of [0, 0.25, 0.5, 0.9]) {
        const [a, b, rest] = screen(blend(from, to, t, 7), from, to);
        expect(a).toBeCloseTo(1 - t, 12);
        expect(b).toBeCloseTo(t, 12);
        expect(rest).toBe(0);
      }
    }
  });

  it("ends on the target alone", () => {
    expect(blend(6, 4, 1, 7)).toEqual([0, 0, 0, 0, 1, 0, 0]);
    expect(blend(2, 2, 0.3, 3)).toEqual([0, 0, 1]);
  });

  it("matches the rail's crossfade for neighbors", () => {
    crossfade(1.4, 3).forEach((v, i) => expect(blend(1, 2, 0.4, 3)[i]).toBeCloseTo(v, 12));
  });
});

describe("stopBand", () => {
  const bands = [6, 6, 4, 1, -1, 3, -1];
  it("takes the stop's own band", () => {
    expect(stopBand(bands, 2)).toBe(4);
    expect(stopBand(bands, 5)).toBe(3);
  });
  it("keeps the last band picked before a stop without one", () => {
    expect(stopBand(bands, 4)).toBe(1);
    expect(stopBand(bands, 6)).toBe(3);
  });
  it("starts on the first band when no stop picked one yet", () => {
    expect(stopBand([-1, 2], 0)).toBe(0);
    expect(stopBand([], 0)).toBe(0);
  });
});
