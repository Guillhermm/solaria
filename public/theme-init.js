// Loaded as a blocking script in <head> so the first paint already has the right theme.
// A stored choice wins; otherwise the system setting, followed live. Without this script
// the page stays dark, the default in tokens.css.
(() => {
  const root = document.documentElement;
  const query = window.matchMedia("(prefers-color-scheme: light)");
  const stored = () => {
    try {
      const value = localStorage.getItem("theme");
      return value === "light" || value === "dark" ? value : null;
    } catch {
      return null;
    }
  };
  const apply = () => {
    root.dataset.theme = stored() ?? (query.matches ? "light" : "dark");
  };
  apply();
  query.addEventListener("change", () => {
    if (!stored()) apply();
  });
})();
