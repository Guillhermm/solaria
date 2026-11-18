// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadContent } from "@/content/load";
import { attractOn, countdownText, journeyOrder, nextJourney, setAttract, subscribeAttract } from "./kiosk";

beforeEach(() => sessionStorage.clear());

describe("kiosk helpers", () => {
  it("goes from Journey to Journey in order, the first after the last (K5)", () => {
    expect(nextJourney(["andromeda", "sun"], "andromeda")).toBe("sun");
    expect(nextJourney(["andromeda", "sun"], "sun")).toBe("andromeda");
    expect(nextJourney(["andromeda"], "andromeda")).toBe("andromeda");
  });

  it("orders the loop by the pixel count of each Journey's image, largest first, without the mock Journeys", () => {
    const j = (slug: string, mock = false) => ({ slug, mock, imageId: `${slug}-image` });
    const img = (slug: string, width: number, height: number) => ({ id: `${slug}-image`, tiles: { width, height } });
    const images = [img("andromeda", 42208, 9870), img("sun", 4096, 4096), img("pillars", 6780, 7071), img("mock-tour", 99999, 99999), img("tie-b", 100, 100), img("tie-a", 50, 200)];
    expect(journeyOrder([j("sun"), j("andromeda"), j("mock-tour", true), j("tie-b"), j("pillars"), j("tie-a"), j("no-image")], images)).toEqual([
      "andromeda",
      "pillars",
      "sun",
      "tie-a",
      "tie-b",
      "no-image",
    ]);
  });

  it("orders the published Journeys largest image first", () => {
    const { journeys, images } = loadContent({ root: process.cwd(), mode: "production" });
    const pixels = (slug: string) => {
      const t = images.find((i) => i.id === journeys.find((x) => x.slug === slug)!.imageId)!.tiles;
      return t.width * t.height;
    };
    const order = journeyOrder(journeys, images);
    expect(order).toHaveLength(journeys.length);
    order.slice(1).forEach((slug, k) => expect(pixels(order[k])).toBeGreaterThanOrEqual(pixels(slug)));
  });

  it("writes the countdown as design.md 5.8 has it", () => {
    expect(countdownText(10)).toBe("Still exploring? Returning to the start in 10 s.");
  });

  it("stores the attract flag and tells subscribers", () => {
    const seen = vi.fn();
    const off = subscribeAttract(seen);
    setAttract(true);
    expect(attractOn()).toBe(true);
    setAttract(false);
    expect(attractOn()).toBe(false);
    expect(sessionStorage.getItem("solaria:attract")).toBeNull();
    expect(seen).toHaveBeenCalledTimes(2);
    off();
  });

  it("keeps the flag in memory when storage refuses it", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    setAttract(true);
    expect(attractOn()).toBe(true);
    spy.mockRestore();
    vi.restoreAllMocks();
  });
});

describe("kiosk with storage refused", () => {
  it("starts the attract loop, since ?kiosk=1 could not store it", async () => {
    vi.resetModules();
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const fresh = await import("./kiosk");
    expect(fresh.attractOn()).toBe(true);
    vi.restoreAllMocks();
  });
});
