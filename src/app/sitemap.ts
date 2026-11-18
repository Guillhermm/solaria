import type { MetadataRoute } from "next";
import { loadContent } from "@/content/load";
import { sitemapEntries } from "@/seo/seo";

export const dynamic = "force-static";

// Production content whatever SOLARIA_CONTENT says, so the end-to-end build with its mock
// and staged pages still lists only what is published.
const sitemap = (): MetadataRoute.Sitemap => sitemapEntries(loadContent({ root: process.cwd(), mode: "production" }));

export default sitemap;
