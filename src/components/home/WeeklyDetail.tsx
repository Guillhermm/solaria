import Link from "next/link";
import { LuArrowRight } from "react-icons/lu";
import { tileUrl } from "@/content/tiles";
import { lensTicks } from "@/home/lens";
import { formatInt, formatZoom } from "@/viewer/view";
import type { WeeklyCard } from "@/weekly/card";
import CropTiles from "./CropTiles";
import styles from "./WeeklyDetail.module.css";

// The crop's side at the default root size, for placing ruler ticks by ratio (lens.ts).
const CROP_PX = 21.25 * 16;
const TICK_GAP_PX = 7 * 16 * 0.75;

const pct = (n: number) => `${n}%`;

// design.md 15.3: one validated stop or label of the week, drawn from the tile pyramid at build time.
const WeeklyDetail = ({ card, tileBaseUrl }: { card: WeeklyCard; tileBaseUrl: string }) => {
  const { field, image } = card;
  const top = lensTicks(field.x, field.side, image.width, CROP_PX, TICK_GAP_PX);
  const left = lensTicks(field.y, field.side, image.height, CROP_PX, TICK_GAP_PX * 0.66);
  return (
    <section className={styles.weekly} aria-labelledby="weekly-title">
      <h2 id="weekly-title" className={styles.heading}>
        Detail of the week
      </h2>
      <div className={styles.layout}>
        <div className={styles.media}>
          <div className={styles.cropBox}>
            <div className={styles.crop} role="img" aria-label={card.alt} data-image-title={image.title} data-testid="weekly-crop">
              <div className={styles.canvas} data-theme="dark" data-testid="weekly-canvas">
                <CropTiles
                  tiles={card.tiles.map((t) => ({
                    key: t.key,
                    src: tileUrl(tileBaseUrl, image.id, t.level, t.col, t.row),
                    style: { left: pct(t.left), top: pct(t.top), width: pct(t.width), height: pct(t.height) },
                  }))}
                  className={styles.tile}
                />
                {card.mark !== "bracket" && <span className={styles.ring} data-mark={card.mark} aria-hidden />}
              </div>
              <div className={`${styles.ruler} ${styles.rulerTop}`} data-theme="dark" aria-hidden data-testid="weekly-ruler-top">
                {top.minor.map((at) => (
                  <span key={`m${at}`} className={styles.minor} style={{ left: pct(at) }} />
                ))}
                {top.major.map(({ value, at }) => (
                  <span key={value} className={styles.major} style={{ left: pct(at) }}>
                    <span className={styles.label}>{formatInt(value)}</span>
                  </span>
                ))}
              </div>
              <div className={`${styles.ruler} ${styles.rulerLeft}`} data-theme="dark" aria-hidden data-testid="weekly-ruler-left">
                {left.minor.map((at) => (
                  <span key={`m${at}`} className={styles.minor} style={{ top: pct(at) }} />
                ))}
                {left.major.map(({ value, at }) => (
                  <span key={value} className={styles.major} style={{ top: pct(at) }}>
                    <span className={styles.label}>{formatInt(value)}</span>
                  </span>
                ))}
              </div>
            </div>
            {card.mark === "bracket" && <span className={styles.bracket} data-mark="bracket" aria-hidden />}
          </div>
          <dl className={styles.readout} data-testid="weekly-readout">
            <div>
              <dt>Zoom</dt>
              <dd>{formatZoom(field.zoom)}</dd>
            </div>
            <div>
              <dt>Center x</dt>
              <dd>{formatInt(field.x)}</dd>
            </div>
            <div>
              <dt>Center y</dt>
              <dd>{formatInt(field.y)}</dd>
            </div>
          </dl>
          <p className={styles.credit} data-testid="weekly-credit">
            {card.credit}
          </p>
        </div>
        <div className={styles.text} data-testid="weekly-text">
          <p className={styles.eyebrow} data-testid="weekly-week">
            Week {card.week}
          </p>
          <h3 id="weekly-item" className={styles.title}>
            {card.title}
          </h3>
          <p className={styles.context} data-testid="weekly-context">
            {card.context}
          </p>
          {card.paragraphs.map((p) => (
            <p key={p} className={styles.body} data-testid="weekly-body">
              {p}
            </p>
          ))}
          {card.caveat && (
            <p className={styles.caveat} data-testid="weekly-caveat">
              {card.caveat}
            </p>
          )}
          <Link href={card.href} className={styles.go} aria-describedby="weekly-item" data-testid="weekly-go">
            Go to this detail
            <LuArrowRight aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default WeeklyDetail;
