import React from "react";
import Header from "@/components/globals/Header";
import Footer from "@/components/globals/Footer";

const SiteLayout = ({ children }: Readonly<{ children: React.ReactNode }>) => (
  <>
    <Header />
    <main>{children}</main>
    <Footer />
  </>
);

export default SiteLayout;
