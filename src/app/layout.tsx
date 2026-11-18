import React from "react";
import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { analyticsEnabled } from "@/analytics/analytics";
import Kiosk from "@/components/kiosk/Kiosk";
import SiteAnalytics from "@/components/SiteAnalytics";
import { getContent } from "@/content/load";
import { journeyOrder } from "@/kiosk/kiosk";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/seo/seo";
import { GROUND } from "./theme-color";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_NAME,
  description: SITE_DESCRIPTION,
  // Search Console ownership token; public by design.
  verification: { google: "rkg6DyBZ44QyNpVlFY7fIc9RAp6hZkBTdyDLKzNcZQI" },
};

export const viewport: Viewport = {
  themeColor: GROUND,
};

const RootLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => (
  // theme-init.js sets data-theme before hydration, so the server markup cannot match it.
  <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`} suppressHydrationWarning>
    <head>
      {/* Must block the first paint, or a light-theme visitor sees a dark flash. */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="/theme-init.js" />
    </head>
    <body>
      {children}
      {/* Renders nothing unless ?kiosk=1 started kiosk mode; the attract loop follows Home's order. */}
      <Kiosk journeys={journeyOrder(getContent().journeys, getContent().images)} />
      {/* Evaluated at build time; renders nothing visible and no link, so kiosk mode is unaffected. */}
      {analyticsEnabled(process.env) && <SiteAnalytics />}
    </body>
  </html>
);

export default RootLayout;
