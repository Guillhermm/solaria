// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { attractOn, countdownText, nextJourney, setAttract, subscribeAttract } from "./kiosk";

beforeEach(() => sessionStorage.clear());

describe("kiosk helpers", () => {
  it("goes from Journey to Journey in order, the first after the last (K5)", () => {
    expect(nextJourney(["andromeda", "sun"], "andromeda")).toBe("sun");
    expect(nextJourney(["andromeda", "sun"], "sun")).toBe("andromeda");
    expect(nextJourney(["andromeda"], "andromeda")).toBe("andromeda");
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
