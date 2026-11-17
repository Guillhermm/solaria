import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DIAGONAL, INK, MASKABLE, TILE, encodeIco, tileSvg } from "./generate-icons";

const viewBox = (svg: string) => Number(svg.match(/viewBox="0 0 ([\d.]+)/)![1]);

describe("generate-icons", () => {
  it("draws the mark in the dark --text token", () => {
    const tokens = readFileSync("src/styles/tokens.css", "utf8");
    expect(tokens).toContain(`--text: ${INK};`);
    expect(TILE).toContain(`stroke="${INK}"`);
  });

  it("keeps the header mark's geometry: 8.5 path, 1.5 stroke, turned 45 degrees", () => {
    const svg = tileSvg(0.7, 0);
    expect(svg).toContain('width="8.5" height="8.5" rx="0.25"');
    expect(svg).toContain('stroke-width="1.5"');
    expect(svg).toMatch(/rotate\(45 /);
    expect(svg).toContain('rx="0"');
  });

  it("keeps the maskable mark inside the 80% safe zone", () => {
    // The turned square's farthest point from the center is half its diagonal.
    expect(DIAGONAL / 2 / viewBox(MASKABLE)).toBeLessThanOrEqual(0.4);
  });

  it("writes an ICO directory that points at each PNG", () => {
    const a = Buffer.from([1, 2, 3]);
    const b = Buffer.from([4, 5]);
    const ico = encodeIco([{ size: 16, png: a }, { size: 256, png: b }]);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBe(2);
    expect(ico.readUInt8(6)).toBe(16);
    expect(ico.readUInt8(22)).toBe(0);
    expect(ico.readUInt32LE(6 + 8)).toBe(3);
    expect(ico.readUInt32LE(6 + 12)).toBe(38);
    expect(ico.readUInt32LE(22 + 12)).toBe(41);
    expect([...ico.subarray(38)]).toEqual([1, 2, 3, 4, 5]);
  });

  it("matches the committed icon.svg", () => {
    expect(readFileSync("src/app/icon.svg", "utf8")).toBe(TILE);
  });
});
