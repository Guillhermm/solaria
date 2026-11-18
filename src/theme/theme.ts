// The theme lives on <html data-theme>, set before paint by public/theme-init.js.
// React reads it from there instead of keeping a copy that could disagree.

export type Theme = "light" | "dark";

export const STORAGE_KEY = "theme";

export const readTheme = (root: HTMLElement): Theme =>
  root.dataset.theme === "light" ? "light" : "dark";

export const otherTheme = (theme: Theme): Theme => (theme === "light" ? "dark" : "light");

export const setTheme = (root: HTMLElement, theme: Theme, storage?: Storage) => {
  root.dataset.theme = theme;
  try {
    storage?.setItem(STORAGE_KEY, theme);
  } catch {
    // Private windows can refuse storage; the choice then lasts for this page only.
  }
};

export const subscribeTheme = (root: HTMLElement, onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
};
