import HomeHero from "@/components/home/HomeHero";
import InstrumentKey from "@/components/home/InstrumentKey";
import JourneyIndex, { type JourneyEntry } from "@/components/home/JourneyIndex";
import { getContent } from "@/content/load";
import { resolveTileBase } from "@/content/tiles";
import { aimableStops, lensField } from "@/home/lens";
import { stopNumber } from "@/viewer/story";
import styles from "./page.module.css";

const entries = (): JourneyEntry[] => {
  const { journeys, images, sources } = getContent();
  return journeys.flatMap((journey) => {
    const image = images.find((i) => i.id === journey.imageId);
    const source = image && sources.find((s) => s.id === image.sourceId);
    return image && source ? [{ journey, image, source }] : [];
  });
};

const Home = () => {
  const tileBaseUrl = resolveTileBase(process.env.TILE_BASE_URL);
  const list = entries();
  const first = list[0];
  const aimable = first ? aimableStops(first.journey.stops) : [];

  return (
    <>
      {first && aimable.length > 0 ? (
        <HomeHero
          eyebrow={`Journey ${stopNumber(0)} of ${stopNumber(list.length - 1)} · ${first.image.observatory.value}`}
          journeySlug={first.journey.slug}
          stops={first.journey.stops}
          image={{ id: first.image.id, width: first.image.tiles.width, height: first.image.tiles.height, tiles: first.image.tiles }}
          tileBaseUrl={tileBaseUrl}
          credit={first.source.credit}
        />
      ) : (
        <h1 className={styles.plainTitle}>Fly into one giant image.</h1>
      )}
      <JourneyIndex entries={list} tileBaseUrl={tileBaseUrl} />
      {first && aimable.length > 0 && (
        <InstrumentKey sample={lensField(first.journey.stops[aimable[0]], first.image.tiles)} />
      )}
    </>
  );
};

export default Home;
