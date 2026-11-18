import { describe, expect, it } from "vitest";
import { keyAction, zoomAnnouncement } from "./keys";

const press = (key: string, mods: Partial<{ shiftKey: boolean; ctrlKey: boolean; metaKey: boolean; altKey: boolean }> = {}) =>
  keyAction({ key, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, ...mods });

describe("viewer keys (design.md 7.1)", () => {
  it("zooms 2x in and out with plus and minus, with or without Shift", () => {
    expect(press("+")).toEqual({ kind: "zoom", factor: 2 });
    expect(press("=")).toEqual({ kind: "zoom", factor: 2 });
    expect(press("-")).toEqual({ kind: "zoom", factor: 0.5 });
    expect(press("_", { shiftKey: true })).toEqual({ kind: "zoom", factor: 0.5 });
  });

  it("pans 10 % of the view with the arrows, 50 % with Shift", () => {
    expect(press("ArrowRight")).toEqual({ kind: "pan", dx: 0.1, dy: 0 });
    expect(press("ArrowLeft")).toEqual({ kind: "pan", dx: -0.1, dy: 0 });
    expect(press("ArrowUp", { shiftKey: true })).toEqual({ kind: "pan", dx: 0, dy: -0.5 });
    expect(press("ArrowDown")).toEqual({ kind: "pan", dx: 0, dy: 0.1 });
  });

  it("fits with 0 or Home and toggles fullscreen with F", () => {
    expect(press("0")).toEqual({ kind: "home" });
    expect(press("Home")).toEqual({ kind: "home" });
    expect(press("f")).toEqual({ kind: "fullscreen" });
    expect(press("F", { shiftKey: true })).toEqual({ kind: "fullscreen" });
  });

  it("leaves browser shortcuts and other keys alone", () => {
    expect(press("+", { ctrlKey: true })).toBeNull();
    expect(press("-", { metaKey: true })).toBeNull();
    expect(press("ArrowLeft", { altKey: true })).toBeNull();
    expect(press("Tab")).toBeNull();
    expect(press("w")).toBeNull();
    expect(press("r")).toBeNull();
  });

  it("announces the zoom to one decimal", () => {
    expect(zoomAnnouncement(14.26)).toBe("Zoom 14.3×");
  });
});
