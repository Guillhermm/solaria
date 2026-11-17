// Kiosk mode (design.md 14.3). The flag lives in sessionStorage, set before the first paint by
// public/theme-init.js from ?kiosk=1 or ?kiosk=0, and shows on <html data-kiosk>.
export const KIOSK_KEY = "solaria:kiosk";
export const ATTRACT_KEY = "solaria:attract";

export const DWELL_MS = 8_000; // K6: each attract stop, after its flight settles
export const IDLE_MS = 90_000; // K12
export const COUNTDOWN_S = 10;

export const countdownText = (seconds: number) => `Still exploring? Returning to the start in ${seconds} s.`;
export const RESET_TEXT = "Returning to the start.";

export const storySearch1 = (slug: string) => `/${slug}/?mode=story&stop=1`;

// K5: the Journey after `slug` in Home's order, the first after the last.
export const nextJourney = (order: readonly string[], slug: string) => order[(order.indexOf(slug) + 1) % order.length];

const ATTRACT_EVENT = "solaria:attract";
// Mirrors the stored flag where storage is refused (a private window), for this page only. It
// starts on: theme-init.js could not store ?kiosk=1's loop either, and kiosk mode alone (from
// the URL) decides whether it shows.
let memory = true;

export const attractOn = () => {
  try {
    return window.sessionStorage.getItem(ATTRACT_KEY) === "1";
  } catch {
    return memory;
  }
};

export const setAttract = (on: boolean) => {
  memory = on;
  try {
    if (on) window.sessionStorage.setItem(ATTRACT_KEY, "1");
    else window.sessionStorage.removeItem(ATTRACT_KEY);
  } catch {
    // The in-memory flag carries it.
  }
  window.dispatchEvent(new Event(ATTRACT_EVENT));
};

export const subscribeAttract = (onChange: () => void) => {
  window.addEventListener(ATTRACT_EVENT, onChange);
  return () => window.removeEventListener(ATTRACT_EVENT, onChange);
};

export const isKiosk = (root: HTMLElement) => root.hasAttribute("data-kiosk");

export const subscribeKiosk = (root: HTMLElement, onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(root, { attributes: true, attributeFilter: ["data-kiosk"] });
  return () => observer.disconnect();
};
