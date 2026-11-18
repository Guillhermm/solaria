import type { Metadata, MetadataRoute } from "next";
import type { Content, ImageManifest, Journey } from "@/content/types";

export const SITE_URL = "https://solaria.zenus.systems";
export const SITE_NAME = "Solaria";
export const SITE_DESCRIPTION = "Explore very large NASA images in the browser, one guided zoom at a time.";

// Viewer URLs carry ?mode, x, y, z and stop; every one of them is the same page to a search
// engine, so the canonical keeps the path only, with the trailing slash the export serves.
export const canonicalUrl = (path: string) => {
  const url = new URL(path, SITE_URL);
  const pathname = url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
  return `${SITE_URL}${pathname}`;
};

// The tile base is a root-relative path or an https URL (resolveTileBase); either way the
// card image has to be absolute.
export const thumbnailFor = (tileBaseUrl: string, image: ImageManifest) => ({
  url: new URL(`${tileBaseUrl}/${encodeURIComponent(image.id)}/thumbnail.jpg`, SITE_URL).href,
  width: image.tiles.thumbnail.width,
  height: image.tiles.thumbnail.height,
});

// The image a Journey card shows: the band it opens on, as on Home.
export const journeyImage = (content: Content, journey: Journey) =>
  content.images.find((i) => i.id === (journey.stops[0]?.band ?? journey.imageId));

export const pageMetadata = (page: {
  path: string;
  title: string;
  description: string;
  image?: { url: string; width: number; height: number };
}): Metadata => {
  const url = canonicalUrl(page.path);
  const images = page.image ? [page.image] : undefined;
  return {
    description: page.description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, url, title: page.title, description: page.description, images },
    twitter: {
      card: page.image ? "summary_large_image" : "summary",
      title: page.title,
      description: page.description,
      images: page.image ? [page.image.url] : undefined,
    },
  };
};

export const robotsFor = (): MetadataRoute.Robots => ({
  rules: { userAgent: "*", allow: "/" },
  sitemap: `${SITE_URL}/sitemap.xml`,
});

// Expects production content: the caller loads it behind the publish gate.
export const sitemapEntries = (content: Content): MetadataRoute.Sitemap => {
  const entry = (path: string, record?: { validation: { date: string | null } }) => {
    const date = record?.validation.date;
    return date ? { url: canonicalUrl(path), lastModified: date } : { url: canonicalUrl(path) };
  };
  return [
    entry("/"),
    entry("/about/"),
    ...content.images.filter((i) => !i.mock).map((i) => entry(`/${i.id}/`, i)),
    ...content.journeys.filter((j) => !j.mock).map((j) => entry(`/${j.slug}/`, j)),
  ];
};
