import React from "react";
import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import Header from "@/components/globals/Header";
import Footer from "@/components/globals/Footer";
import "bootstrap/dist/css/bootstrap.min.css";
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
    <body className="d-flex flex-column antialiased">
      <Header />
      <main className="flex-grow-1 d-flex flex-column gap-3 align-items-start">
        {children}
      </main>
      <Footer />
    </body>
  </html>
);

export default RootLayout;
