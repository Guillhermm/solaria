// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { otherTheme, readTheme, setTheme, subscribeTheme } from "./theme";

const bootScript = readFileSync(join(process.cwd(), "public/theme-init.js"), "utf8");

const fakeMedia = (matches: boolean) => {
  const listeners: (() => void)[] = [];
  const query = {
    matches,
    addEventListener: (_: string, fn: () => void) => listeners.push(fn),
  };
  vi.stubGlobal("matchMedia", () => query);
  return {
    change: (next: boolean) => {
      query.matches = next;
      listeners.forEach((fn) => fn());
    },
  };
};

// jsdom does not execute <script> elements by default, so run the file's text directly.
const runBoot = () => new Function(bootScript)();

beforeEach(() => {
  delete document.documentElement.dataset.theme;
  document.documentElement.removeAttribute("data-kiosk");
  localStorage.clear();
  sessionStorage.clear();
  window.history.replaceState(null, "", "/");
});

afterEach(() => vi.unstubAllGlobals());

describe("theme-init.js", () => {
  it("follows the system setting when nothing is stored", () => {
    fakeMedia(true);
    runBoot();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("defaults to dark when the system has no light preference", () => {
    fakeMedia(false);
    runBoot();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("prefers the stored choice over the system", () => {
    fakeMedia(true);
    localStorage.setItem("theme", "dark");
    runBoot();
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("ignores a stored value that is not a theme", () => {
    fakeMedia(true);
    localStorage.setItem("theme", "sepia");
    runBoot();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("tracks system changes until the user picks a theme", () => {
    const media = fakeMedia(false);
    runBoot();
    media.change(true);
    expect(document.documentElement.dataset.theme).toBe("light");
    localStorage.setItem("theme", "light");
    media.change(false);
    expect(document.documentElement.dataset.theme).toBe("light");
  });
});

describe("theme helpers", () => {
  it("reads dark unless the root says light", () => {
    const root = document.createElement("html");
    expect(readTheme(root)).toBe("dark");
    root.dataset.theme = "light";
    expect(readTheme(root)).toBe("light");
  });

  it("flips between the two themes", () => {
    expect(otherTheme("dark")).toBe("light");
    expect(otherTheme("light")).toBe("dark");
  });

  it("sets the attribute and stores the choice", () => {
    const root = document.createElement("html");
    setTheme(root, "light", localStorage);
    expect(root.dataset.theme).toBe("light");
    expect(localStorage.getItem("theme")).toBe("light");
  });

  it("still switches when storage refuses the write", () => {
    const root = document.createElement("html");
    const refusing = { setItem: () => { throw new Error("denied"); } } as unknown as Storage;
    setTheme(root, "light", refusing);
    expect(root.dataset.theme).toBe("light");
  });

  it("notifies subscribers when the attribute changes", async () => {
    const root = document.createElement("html");
    const onChange = vi.fn();
    const stop = subscribeTheme(root, onChange);
    root.dataset.theme = "light";
    await Promise.resolve();
    expect(onChange).toHaveBeenCalledTimes(1);
    stop();
  });
});

describe("theme-init.js in kiosk mode (design.md 14.3, K1 and K2)", () => {
  it("turns kiosk on from ?kiosk=1, starts the attract loop and forces dark over a stored light", () => {
    fakeMedia(true);
    localStorage.setItem("theme", "light");
    window.history.replaceState(null, "", "/?kiosk=1");
    runBoot();
    expect(document.documentElement.hasAttribute("data-kiosk")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(sessionStorage.getItem("solaria:kiosk")).toBe("1");
    expect(sessionStorage.getItem("solaria:attract")).toBe("1");
  });

  it("keeps kiosk on a later page of the session, without restarting the loop", () => {
    fakeMedia(false);
    sessionStorage.setItem("solaria:kiosk", "1");
    window.history.replaceState(null, "", "/about/");
    runBoot();
    expect(document.documentElement.hasAttribute("data-kiosk")).toBe(true);
    expect(sessionStorage.getItem("solaria:attract")).toBeNull();
  });

  it("ends kiosk with ?kiosk=0", () => {
    fakeMedia(true);
    sessionStorage.setItem("solaria:kiosk", "1");
    sessionStorage.setItem("solaria:attract", "1");
    window.history.replaceState(null, "", "/?kiosk=0");
    runBoot();
    expect(document.documentElement.hasAttribute("data-kiosk")).toBe(false);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(sessionStorage.length).toBe(0);
  });
});
