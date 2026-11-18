import type { BeforeSend } from "@vercel/analytics/next";

// Vercel sets VERCEL=1 in its build environment only, so local builds, e2e and the static
// server render no analytics tag and request no /_vercel path.
export const analyticsEnabled = (env: Record<string, string | undefined>) => env.VERCEL === "1";

// The viewer rewrites ?x, y, z, mode and stop on every pan and zoom, and a stop can share a
// path segment with a query value. Counting those would burn the 50,000 monthly events, so a
// view is the path alone and a repeat of the last one is dropped.
export const createBeforeSend = (): BeforeSend => {
  let last: string | null = null;
  return (event) => {
    let url: URL;
    try {
      url = new URL(event.url);
    } catch {
      return null;
    }
    url.search = "";
    url.hash = "";
    const next = url.toString();
    if (event.type === "pageview") {
      if (next === last) return null;
      last = next;
    }
    return { ...event, url: next };
  };
};
