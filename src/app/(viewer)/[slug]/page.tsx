import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Explore from "@/components/explore/Explore";
import { getContent } from "@/content/load";
import { resolveTileBase } from "@/content/tiles";
import { infoFor } from "@/viewer/info";

interface Params {
  params: Promise<{ slug: string }>;
}

// Static export: one page per image manifest, and no other slug exists.
export const dynamicParams = false;

export const generateStaticParams = () => getContent().images.map((image) => ({ slug: image.id }));

const imageFor = (slug: string) => getContent().images.find((image) => image.id === slug);

export const generateMetadata = async ({ params }: Params): Promise<Metadata> => {
  const image = imageFor((await params).slug);
  return { title: image ? `${image.title} | Solaria` : "Solaria" };
};

const ImagePage = async ({ params }: Params) => {
  const image = imageFor((await params).slug);
  if (!image) notFound();
  const source = getContent().sources.find((s) => s.id === image.sourceId);
  if (!source) throw new Error(`data/sources/${image.sourceId}.json is missing for image ${image.id}`);

  return <Explore image={image} info={infoFor(image, source)} tileBaseUrl={resolveTileBase(process.env.TILE_BASE_URL)} />;
};

export default ImagePage;
