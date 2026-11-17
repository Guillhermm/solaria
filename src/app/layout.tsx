import React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Kiosk from "@/components/kiosk/Kiosk";
import { getContent } from "@/content/load";
import "./globals.css";

export const metadata: Metadata = {
  title: "NASA 2025 Solaria",
  description: "Embiggen Your Eyes App",
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
      <Kiosk journeys={getContent().journeys.map((j) => j.slug)} />
    </body>
  </html>
);

export default RootLayout;
