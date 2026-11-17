import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Explore from "@/components/explore/Explore";
import { getContent } from "@/content/load";
import { resolveTileBase } from "@/content/tiles";
import { infoFor } from "@/viewer/info";

interface Params {
  params: Promise<{ slug: string }>;
}

// Static export: one page per image manifest and one per Journey (the validator keeps their
// slugs apart), and no other slug exists.
export const dynamicParams = false;

export const generateStaticParams = () => {
  const { images, journeys } = getContent();
  return [...images.map((image) => ({ slug: image.id })), ...journeys.map((journey) => ({ slug: journey.slug }))];
};

// A Journey slug opens its image in Story mode; an image id opens Explore.
const pageFor = (slug: string) => {
  const { images, journeys } = getContent();
  const journey = journeys.find((j) => j.slug === slug);
  const image = images.find((i) => i.id === (journey ? journey.imageId : slug));
  return image ? { image, journey } : undefined;
};

export const generateMetadata = async ({ params }: Params): Promise<Metadata> => {
  const page = pageFor((await params).slug);
  if (!page) return { title: "Solaria" };
  return { title: `${page.journey?.title ?? page.image.title} | Solaria` };
};

const ViewerPage = async ({ params }: Params) => {
  const page = pageFor((await params).slug);
  if (!page) notFound();
  const { image, journey } = page;
  const source = getContent().sources.find((s) => s.id === image.sourceId);
  if (!source) throw new Error(`data/sources/${image.sourceId}.json is missing for image ${image.id}`);

  return (
    <Explore
      image={image}
      info={infoFor(image, source)}
      tileBaseUrl={resolveTileBase(process.env.TILE_BASE_URL)}
      journey={journey}
    />
  );
};

export default ViewerPage;
