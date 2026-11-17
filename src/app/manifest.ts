import type { MetadataRoute } from "next";
import { GROUND } from "./theme-color";

// `id` resolves against the start URL's origin, so the app's identity is
// https://solaria.zenus.systems/ and cannot collide with another app on zenus.systems
// (docs/architecture.md, section 14).
const manifest = (): MetadataRoute.Manifest => ({
  id: "/",
  start_url: "/",
  scope: "/",
  name: "Solaria",
  short_name: "Solaria",
  description: "Explore very large NASA images in the browser, one guided zoom at a time.",
  display: "standalone",
  background_color: GROUND,
  theme_color: GROUND,
  icons: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
});

export const dynamic = "force-static";

export default manifest;
