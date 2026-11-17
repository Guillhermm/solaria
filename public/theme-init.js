// Loaded as a blocking script in <head> so the first paint already has the right theme.
// A stored choice wins; otherwise the system setting, followed live. Without this script
// the page stays dark, the default in tokens.css.
// Kiosk mode (design.md 14.3, K1 and K2) is decided here too: ?kiosk=1 turns it on for the
// session and starts the attract loop, ?kiosk=0 turns it off, and a kiosk is always dark.
(() => {
  const root = document.documentElement;
  const query = window.matchMedia("(prefers-color-scheme: light)");
  const session = (key, value) => {
    try {
      if (value === undefined) return sessionStorage.getItem(key);
      if (value === null) sessionStorage.removeItem(key);
      else sessionStorage.setItem(key, value);
    } catch {
      // Storage refused: the flag holds for this page only.
    }
    return null;
  };
  const asked = new URLSearchParams(location.search).get("kiosk");
  if (asked === "1") {
    session("solaria:kiosk", "1");
    session("solaria:attract", "1");
  } else if (asked === "0") {
    session("solaria:kiosk", null);
    session("solaria:attract", null);
  }
  const kiosk = asked === "1" || (asked !== "0" && session("solaria:kiosk") === "1");
  if (kiosk) root.setAttribute("data-kiosk", "");
  const stored = () => {
    try {
      const value = localStorage.getItem("theme");
      return value === "light" || value === "dark" ? value : null;
    } catch {
      return null;
    }
  };
  const apply = () => {
    root.dataset.theme = kiosk ? "dark" : (stored() ?? (query.matches ? "light" : "dark"));
  };
  apply();
  query.addEventListener("change", () => {
    if (!stored()) apply();
  });
})();
