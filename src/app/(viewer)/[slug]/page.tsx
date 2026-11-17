import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CompareView } from "@/components/compare/types";
import Explore from "@/components/explore/Explore";
import type { LightView } from "@/components/light/types";
import { getContent } from "@/content/load";
import { resolveTileBase } from "@/content/tiles";
import { nextJourney } from "@/kiosk/kiosk";
import { buildSearchIndex } from "@/search/build";
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

  // Compare is offered on the page of a pair's reference image, never on a Journey (yet).
  const content = getContent();
  const pairs: CompareView[] = journey
    ? []
    : content.pairs
        .filter((p) => p.reference === image.id)
        .flatMap((pair) => {
          const moving = content.images.find((i) => i.id === pair.imageIds.find((id) => id !== image.id));
          const movingSource = moving && content.sources.find((s) => s.id === moving.sourceId);
          return moving && movingSource ? [{ pair, moving, movingInfo: infoFor(moving, movingSource) }] : [];
        });

  // Light is offered on the page of a band set's first image; a Journey brings its own band set,
  // whose stops pick the band.
  const bandSets: LightView[] = content.bandSets
        .filter((set) => (journey ? set.id === journey.bandSetId : set.imageIds[0] === image.id))
        .flatMap((set) => {
          const bands = set.imageIds.flatMap((id) => {
            const img = content.images.find((i) => i.id === id);
            const src = img && content.sources.find((s) => s.id === img.sourceId);
            return img && src ? [{ image: img, info: infoFor(img, src) }] : [];
          });
          return bands.length === set.imageIds.length ? [{ set, bands }] : [];
        });

  // Labels of this image; Show takes its zoom from the stops of the Journeys on the same image.
  const labels = content.labels.find((l) => l.imageIds.includes(image.id))?.labels;
  const labelStops = content.journeys.filter((j) => j.imageId === image.id).flatMap((j) => j.stops);

  return (
    <Explore
      image={image}
      info={infoFor(image, source)}
      tileBaseUrl={resolveTileBase(process.env.TILE_BASE_URL)}
      journey={journey}
      pairs={pairs}
      bandSets={bandSets}
      labels={labels}
      labelStops={labelStops}
      nextJourney={journey ? nextJourney(content.journeys.map((j) => j.slug), journey.slug) : undefined}
      search={buildSearchIndex(content)}
    />
  );
};

export default ViewerPage;
