import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio, over, parseColor } from "./contrast";

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");

const block = (selector: string) => {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`tokens.css has no block for ${selector}`);
  const body = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()])
  );
};

const dark = block('[data-theme="dark"]');
// The light block overrides the dark one on the same element, so unset tokens fall back.
const themes = { dark, light: { ...dark, ...block('[data-theme="light"]') } };

// WCAG 2.2 AA: 1.4.3 text 4.5:1; 1.4.11 and 2.4.13 non-text and focus 3:1.
const TEXT = 4.5;
const NON_TEXT = 3;

const pairs: [fg: string, bg: string, min: number][] = [
  ["text", "ground", TEXT],
  ["text-2", "ground", TEXT],
  ["text-muted", "ground", TEXT],
  ["text", "surface", TEXT],
  ["text-2", "surface", TEXT],
  ["text-muted", "surface", TEXT],
  ["text", "surface-2", TEXT],
  ["text-2", "surface-2", TEXT],
  ["accent", "ground", TEXT],
  ["accent", "surface", TEXT],
  ["on-accent", "accent", TEXT],
  ["on-accent", "accent-press", TEXT],
  ["text", "glass", TEXT],
  ["text-muted", "glass", TEXT],
  ["danger", "ground", TEXT],
  ["danger", "surface", TEXT],
  ["tick-major", "ground", NON_TEXT],
];

const resolve = (tokens: Record<string, string>, name: string) => {
  const value = tokens[name];
  if (!value) throw new Error(`token --${name} is not defined`);
  return parseColor(value);
};

describe.each(Object.entries(themes))("%s theme tokens", (_, tokens) => {
  const ground = resolve(tokens, "ground");

  it.each(pairs)("--%s on --%s meets %s:1", (fg, bg, min) => {
    const back = over(resolve(tokens, bg), ground);
    const front = over(resolve(tokens, fg), back);
    expect(contrastRatio(front, back)).toBeGreaterThanOrEqual(min);
  });
});

describe("viewer tokens", () => {
  it("draw markers and the focus ring at 3:1 on the always-dark canvas", () => {
    const canvas = parseColor(dark["viewer-canvas"]);
    expect(contrastRatio(parseColor(dark.marker), canvas)).toBeGreaterThanOrEqual(NON_TEXT);
    expect(contrastRatio(parseColor(dark.accent), canvas)).toBeGreaterThanOrEqual(NON_TEXT);
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white and symmetric", () => {
    const black = parseColor("#000000");
    const white = parseColor("#ffffff");
    expect(contrastRatio(black, white)).toBeCloseTo(21, 5);
    expect(contrastRatio(white, black)).toBeCloseTo(21, 5);
  });

  it("composites alpha before measuring", () => {
    const half = over(parseColor("rgb(255 255 255 / 0.5)"), parseColor("#000000"));
    expect(half.r).toBeCloseTo(127.5);
  });

  it("rejects color syntax it cannot read", () => {
    expect(() => parseColor("hsl(0 0% 0%)")).toThrow(/Unsupported/);
  });
});
