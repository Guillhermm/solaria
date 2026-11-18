export interface Anchor {
  path: string;
  id: string;
}

// "/about/#credits" -> { path: "/about/", id: "credits" }; a link with no fragment is not an anchor.
export const parseAnchor = (href: string): Anchor | null => {
  const at = href.indexOf("#");
  if (at < 0 || at === href.length - 1) return null;
  return { path: href.slice(0, at), id: decodeURIComponent(href.slice(at + 1)) };
};

const trim = (path: string) => path.replace(/\/+$/, "") || "/";

export const samePath = (a: string, b: string) => trim(a) === trim(b);

export const scrollBehavior = (reduced: boolean): ScrollBehavior => (reduced ? "instant" : "smooth");

// Where focus goes after the jump: the target when it is a heading, else the first heading in it.
export const focusTarget = (target: Element): HTMLElement =>
  (target.matches("h1, h2, h3, h4, h5, h6") ? target : (target.querySelector("h1, h2, h3, h4, h5, h6") ?? target)) as HTMLElement;
