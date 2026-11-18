import type { Metadata } from "next";
import HomeHero from "@/components/home/HomeHero";
import InstrumentKey from "@/components/home/InstrumentKey";
import JourneyIndex, { type JourneyEntry } from "@/components/home/JourneyIndex";
import WeeklyDetail from "@/components/home/WeeklyDetail";
import { getContent } from "@/content/load";
import { resolveTileBase } from "@/content/tiles";
import { aimableStops, lensField } from "@/home/lens";
import { homeCard } from "@/seo/home-card";
import { pageMetadata, SITE_DESCRIPTION, SITE_NAME } from "@/seo/seo";
import { weeklyCard } from "@/weekly/card";
import { buildDate } from "@/weekly/pick";
import styles from "./page.module.css";

export const metadata: Metadata = pageMetadata({ path: "/", title: SITE_NAME, description: SITE_DESCRIPTION, image: homeCard() });

const entries = (): JourneyEntry[] => {
  const { journeys, images, sources } = getContent();
  return journeys.flatMap((journey) => {
    // A Journey through a band set shows the band it opens on.
    const image = images.find((i) => i.id === (journey.stops[0]?.band ?? journey.imageId));
    const source = image && sources.find((s) => s.id === image.sourceId);
    return image && source ? [{ journey, image, source }] : [];
  });
};

// "Andromeda, star by star" -> "Andromeda": the Journey's name before its tagline.
const shortTitle = (title: string) => title.split(",")[0].trim();

const Home = () => {
  const tileBaseUrl = resolveTileBase(process.env.TILE_BASE_URL);
  const list = entries();
  const first = list[0];
  const aimable = first ? aimableStops(first.journey.stops) : [];
  // design.md 15.3, W3: the week of the build; the card changes only when the site is rebuilt.
  const weekly = weeklyCard(getContent(), buildDate(process.env, new Date()));

  return (
    <>
      {first && aimable.length > 0 ? (
        <HomeHero
          eyebrow={`${shortTitle(first.journey.title)} · ${first.image.observatory.value} · ${first.journey.stops.length} stops`}
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
      {weekly && <WeeklyDetail card={weekly} tileBaseUrl={tileBaseUrl} />}
      {first && aimable.length > 0 && (
        <InstrumentKey sample={lensField(first.journey.stops[aimable[0]], first.image.tiles)} />
      )}
    </>
  );
};

export default Home;
