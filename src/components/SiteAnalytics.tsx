"use client";

import { Analytics } from "@vercel/analytics/next";
import { createBeforeSend } from "@/analytics/analytics";

// A client component because beforeSend is a function and cannot cross from the server layout.
const beforeSend = createBeforeSend();

const SiteAnalytics = () => <Analytics beforeSend={beforeSend} />;

export default SiteAnalytics;
