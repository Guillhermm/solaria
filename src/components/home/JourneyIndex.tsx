import Image from "next/image";
import Link from "next/link";
import { LuArrowRight } from "react-icons/lu";
import type { ImageManifest, Journey, Source } from "@/content/types";
import { stopNumber } from "@/viewer/story";
import { formatInt } from "@/viewer/view";
import styles from "./JourneyIndex.module.css";

export interface JourneyEntry {
  journey: Journey;
  image: ImageManifest;
  source: Source;
}

// design.md 5.1: a list, not a card grid, so it holds one entry or forty. Filters and paging
// wait until there is more than one published Journey (home-about copy).
const JourneyIndex = ({ entries, tileBaseUrl }: { entries: JourneyEntry[]; tileBaseUrl: string }) => (
  <section id="journeys" className={styles.index} aria-labelledby="journeys-title">
    <h2 id="journeys-title" className={styles.heading}>
      Journeys
    </h2>
    {entries.length > 0 && (
      <ol className={styles.list}>
        {entries.map(({ journey, image }, i) => (
          <li key={journey.slug} className={styles.row}>
            <span className={styles.number}>{stopNumber(i)}</span>
            <span className={styles.frame} data-theme="dark">
              <Image
                src={`${tileBaseUrl}/${image.id}/thumbnail.jpg`}
                width={image.tiles.thumbnail.width}
                height={image.tiles.thumbnail.height}
                alt=""
                unoptimized
              />
            </span>
            <div className={styles.body}>
              <h3 className={styles.title}>{journey.title}</h3>
              <p className={styles.summary}>{journey.summary}</p>
              <p className={styles.meta}>
                {journey.stops.length} stops · Story, Explore{journey.bandSetId ? ", Light" : ""} · {image.observatory.value}
              </p>
            </div>
            <p className={styles.size}>
              {formatInt(image.tiles.width)} × {formatInt(image.tiles.height)} px
            </p>
            <Link className={styles.begin} href={`/${journey.slug}/`} aria-label={`Begin ${journey.title}`}>
              Begin
              <LuArrowRight aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
    )}
    {entries.length === 1 && (
      <div className={styles.note}>
        <h3>More journeys will appear here</h3>
        <p>A journey is listed once its image is tiled and its text has been checked against the source.</p>
      </div>
    )}
    {entries.length === 0 && (
      <div className={styles.note}>
        <h3>No journeys yet</h3>
        <p>
          Nothing is ready to show right now. Check the <Link href="/about/">About page</Link> for the sources Solaria uses.
        </p>
      </div>
    )}
  </section>
);

export default JourneyIndex;
