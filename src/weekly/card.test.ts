import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadContent } from "@/content/load";
import type { Content } from "@/content/types";
import { lensLevel, lensTiles } from "@/home/lens";
import { CROP_DEVICE_PX, cropTiles, weeklyCard } from "./card";

const content = loadContent({ root: process.cwd(), mode: "production" });
const andromeda = JSON.parse(readFileSync("data/journeys/andromeda.json", "utf8"));
const COLOR = "The colors are assigned to two filters, so this is not natural color.";
const SUN_CREDIT = content.sources.find((s) => s.id === "sun-sdo-2024-05-10-aia-211")!.credit;
const M31_CREDIT = content.sources.find((s) => s.id === "andromeda-phat-phast-2025")!.credit;

describe("the pool in data/weekly.json (W1, W2)", () => {
  it("holds the seven validated items in order", () => {
    expect(content.weekly.map((w) => (w.kind === "stop" ? `${w.journey}/${w.stop}` : `${w.labels}/${w.label}`))).toEqual([
      "andromeda/central-core",
      "andromeda/dust-lanes",
      "sun/sdo-ar-171",
      "andromeda/m32",
      "sun/sdo-ar-211",
      "andromeda/ngc-206",
      "andromeda/toward-single-stars",
    ]);
  });
});

describe("weeklyCard (W3 vectors)", () => {
  it.each([
    ["2026-11-17", 47, "211 Å, active region 13664"],
    ["2026-11-23", 48, "NGC 206"],
    ["2026-12-07", 50, "The bright center"],
    ["2026-12-28", 53, "The companion galaxy M32"],
    ["2027-01-03", 53, "The companion galaxy M32"],
    ["2027-01-04", 1, "The bright center"],
  ])("%s, week %i: %s", (date, week, title) => {
    expect(weeklyCard(content, date)).toMatchObject({ week, title });
  });

  it("renders no card for an empty pool", () => {
    expect(weeklyCard({ ...content, weekly: [] } as Content, "2026-11-17")).toBeNull();
  });
});

describe("a Sun stop", () => {
  const card = weeklyCard(content, "2026-11-17")!;

  it("crops its own band and links to its stop (W9, W13)", () => {
    expect(card.image).toMatchObject({ id: "sun-sdo-2024-05-10-aia-211", title: "The Sun, SDO AIA 211 Å, 2024-05-10 12:00 UTC" });
    expect(card.href).toBe("/sun/?mode=story&stop=5");
    expect(card.context).toBe("One Sun, seven bands · Stop 5 of 7");
    expect(card.credit).toBe(SUN_CREDIT);
    expect(card.caveat).toBeNull();
    expect(card.mark).toBe("bracket");
    expect(card.alt).toBe("211 Å, active region 13664, a detail of The Sun, SDO AIA 211 Å, 2024-05-10 12:00 UTC");
  });

  it("uses the stop's lens field and zoom", () => {
    expect(card.field).toEqual({ x: 3010, y: 2510, side: 4096 / 4.5, zoom: 4.5 });
  });

  it("crops 171 Å with aia-171", () => {
    // Week 3: (3 - 1) mod 7 = 2.
    expect(weeklyCard(content, "2026-01-12")!.image.id).toBe("sun-sdo-2024-05-10-aia-171");
  });
});

describe("Andromeda stops", () => {
  it("carry the color line and the stop's own text (W7)", () => {
    const card = weeklyCard(content, "2026-11-23")!;
    expect(card.caveat).toBe(COLOR);
    expect(card.paragraphs).toEqual([andromeda.stops[4].body]);
    expect(card.credit).toBe(M31_CREDIT);
    expect(card.href).toBe("/andromeda/?mode=story&stop=5");
  });

  it("M32 opens with its card text; the rest of the stop text is unchanged", () => {
    const card = weeklyCard(content, "2026-12-28")!;
    const rest = andromeda.stops[3].body.slice(andromeda.stops[3].body.indexOf(", a compact satellite"));
    expect(card.paragraphs).toEqual([`The small, fuzzy yellow patch at the center of this view, upper left of Andromeda's core, is Messier 32${rest}`]);
    expect(card.caveat).toBe(COLOR);
  });

  it("toward single stars is drawn 1:1, a 720 px field at full resolution", () => {
    // Week 7: (7 - 1) mod 7 = 6.
    const card = weeklyCard(content, "2026-02-09")!;
    expect(card.title).toBe("Toward single stars");
    expect(card.field.side).toBe(720);
    expect(card.field.zoom.toFixed(1)).toBe("58.6");
    const max = content.images.find((i) => i.id === "andromeda-phat-phast-2025")!.tiles.maxLevel;
    expect(card.tiles.every((t) => t.level === max)).toBe(true);
  });
});

describe("every card in the pool", () => {
  const cards = content.weekly.map((_, i) => weeklyCard(content, new Date(Date.UTC(2026, 0, 5 + 7 * i)).toISOString().slice(0, 10))!);

  it("is one card per item", () => {
    expect(new Set(cards.map((c) => c.title)).size).toBe(7);
  });

  it("loads 16 tiles at most, from the sharpest level that keeps to that, never past 720 device pixels (W9)", () => {
    for (const card of cards) {
      expect(card.tiles.length).toBeLessThanOrEqual(16);
      const tiles = content.images.find((i) => i.id === card.image.id)!.tiles;
      const level = card.tiles[0].level;
      expect(card.tiles.every((t) => t.level === level)).toBe(true);
      expect(level).toBeLessThanOrEqual(lensLevel(tiles, card.field.side, CROP_DEVICE_PX));
      if (level < lensLevel(tiles, card.field.side, CROP_DEVICE_PX)) expect(cropTiles(tiles, card.field).length).toBe(card.tiles.length);
      const finer = level + 1 <= lensLevel(tiles, card.field.side, CROP_DEVICE_PX) ? lensTiles(tiles, card.field, CROP_DEVICE_PX, level + 1).length : 0;
      expect(finer === 0 || finer > 16).toBe(true);
    }
  });

  it("covers the whole crop with its tiles", () => {
    for (const card of cards) {
      const right = Math.max(...card.tiles.map((t) => t.left + t.width));
      const bottom = Math.max(...card.tiles.map((t) => t.top + t.height));
      expect(Math.min(...card.tiles.map((t) => t.left))).toBeLessThanOrEqual(0);
      expect(Math.min(...card.tiles.map((t) => t.top))).toBeLessThanOrEqual(0);
      expect(right).toBeGreaterThanOrEqual(100);
      expect(bottom).toBeGreaterThanOrEqual(100);
    }
  });
});
