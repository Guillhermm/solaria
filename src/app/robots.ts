import type { MetadataRoute } from "next";
import { robotsFor } from "@/seo/seo";

export const dynamic = "force-static";

const robots = (): MetadataRoute.Robots => robotsFor();

export default robots;
