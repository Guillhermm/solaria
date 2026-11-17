import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import manifest from "./manifest";
import { GROUND } from "./theme-color";

const darkToken = (name: string) => {
  const tokens = readFileSync("src/styles/tokens.css", "utf8");
  const dark = tokens.slice(0, tokens.indexOf('[data-theme="light"]'));
  return dark.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`))?.[1];
};

describe("web app manifest", () => {
  const m = manifest();

  it("has an origin-relative id with an explicit start_url and scope", () => {
    expect(m.id).toBe("/");
    expect(m.start_url).toBe("/");
    expect(m.scope).toBe("/");
    expect(new URL(m.id!, "https://solaria.zenus.systems/sub/page").href).toBe("https://solaria.zenus.systems/");
  });

  it("meets Chrome's install criteria", () => {
    expect(m.name).toBe("Solaria");
    expect(m.short_name).toBeTruthy();
    expect(m.description).toBeTruthy();
    expect(m.display).toBe("standalone");
    expect(m.prefer_related_applications).toBeUndefined();
  });

  it("takes both colors from the dark --ground token", () => {
    expect(darkToken("ground")).toBe(GROUND);
    expect(m.background_color).toBe(GROUND);
    expect(m.theme_color).toBe(GROUND);
  });

  it("lists 192 and 512 icons for any purpose and one 512 maskable", () => {
    const icons = m.icons!;
    const any = icons.filter((i) => i.purpose === "any").map((i) => i.sizes);
    expect(any).toEqual(["192x192", "512x512"]);
    const maskable = icons.filter((i) => i.purpose === "maskable");
    expect(maskable).toEqual([{ src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }]);
    for (const icon of icons) expect(icon.src).toMatch(/^\/icons\/[a-z0-9-]+\.png$/);
  });
});
