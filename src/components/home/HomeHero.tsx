"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { LuArrowRight } from "react-icons/lu";
import type { Stop, TilePyramid } from "@/content/types";
import { tileUrl } from "@/content/tiles";
import { aimableStops, fieldBox, lensAnnouncement, lensField, lensTicks, lensTiles, stepAim } from "@/home/lens";
import { bracketPath } from "@/viewer/route";
import { rulerTicks } from "@/viewer/ruler";
import { stopNumber, stopTarget, storySearch } from "@/viewer/story";
import { formatInt, formatZoom } from "@/viewer/view";
import styles from "./HomeHero.module.css";

export interface HomeHeroProps {
  eyebrow: string;
  journeySlug: string;
  stops: Stop[];
  image: { id: string; width: number; height: number; tiles: TilePyramid };
  tileBaseUrl: string;
  credit: string;
}

const POSTER_ALT =
  "The disk of the Andromeda Galaxy as a wide panorama, in colors assigned to two filters: blue toward the outer edge, yellowish toward the bright center, with dark dust lanes.";

// design.md 6.5: the lens is 21.25rem across. Tiles are chosen for twice that many device
// pixels, and ruler labels sit at least 7rem apart (6.2), both at the default 16px root.
const LENS_PX = 21.25 * 16;
const LENS_DEVICE_PX = LENS_PX * 2;
const LABEL_GAP_PX = 7 * 16;
const RETURN_MS = 600;
const ANNOUNCE_MS = 500;

const remPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

const pct = (n: number) => `${n}%`;

const Bracket = () => (
  <svg className={styles.bracket} viewBox="-13 -13 26 26" aria-hidden>
    <path className={styles.bracketHalo} d={bracketPath(20, 7)} />
    <path d={bracketPath(20, 7)} />
  </svg>
);

const HomeHero = ({ eyebrow, journeySlug, stops, image, tileBaseUrl, credit }: HomeHeroProps) => {
  const aimable = aimableStops(stops);
  const home = aimable[0];
  const [aim, setAim] = useState(home);
  // The lens shows the newest layer over the one before it, so a new stop fades in over the
  // last without a blank frame while its tiles load.
  const [layers, setLayers] = useState([{ stop: home, n: 0 }]);
  const [stripWidth, setStripWidth] = useState(0);

  const heroRef = useRef<HTMLElement>(null);
  const wellRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const leaderHalo = useRef<SVGPathElement>(null);
  const leaderLine = useRef<SVGPathElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const markRefs = useRef(new Map<number, HTMLAnchorElement>());
  const returnTimer = useRef<number | undefined>(undefined);
  const announceTimer = useRef<number | undefined>(undefined);

  const field = lensField(stops[aim], image);
  const box = fieldBox(field, image);

  const aimAt = useCallback(
    (index: number) => {
      window.clearTimeout(returnTimer.current);
      setAim(index);
      setLayers((current) => {
        const top = current[current.length - 1];
        return top.stop === index ? current : [top, { stop: index, n: top.n + 1 }];
      });
      window.clearTimeout(announceTimer.current);
      announceTimer.current = window.setTimeout(() => {
        if (liveRef.current) liveRef.current.textContent = lensAnnouncement(index, lensField(stops[index], image).zoom);
      }, ANNOUNCE_MS);
    },
    [stops, image],
  );

  // design.md 6.5: leaving the strip returns the lens to the current stop after 600 ms.
  const scheduleReturn = () => {
    window.clearTimeout(returnTimer.current);
    returnTimer.current = window.setTimeout(() => aimAt(home), RETURN_MS);
  };

  useEffect(
    () => () => {
      window.clearTimeout(returnTimer.current);
      window.clearTimeout(announceTimer.current);
    },
    [],
  );

  // Leader lines run from the lens's bottom corners to the view box's top corners. They are
  // drawn by hand on resize and on every aim, without React state.
  const drawLeaders = useCallback(() => {
    const hero = heroRef.current;
    const well = wellRef.current;
    const target = boxRef.current;
    if (!hero || !well || !target) return;
    const h = hero.getBoundingClientRect();
    const w = well.getBoundingClientRect();
    const b = target.getBoundingClientRect();
    const at = (x: number, y: number) => `${(x - h.left).toFixed(1)} ${(y - h.top).toFixed(1)}`;
    // An unlaid lens (phone) has no size: no lines.
    const d = w.width > 0 ? `M${at(w.left, w.bottom)}L${at(b.left, b.top)}M${at(w.right, w.bottom)}L${at(b.right, b.top)}` : "";
    leaderHalo.current?.setAttribute("d", d);
    leaderLine.current?.setAttribute("d", d);
  }, []);

  useLayoutEffect(drawLeaders, [drawLeaders, aim]);

  useEffect(() => {
    const strip = stripRef.current;
    const hero = heroRef.current;
    if (!strip || !hero) return;
    const observer = new ResizeObserver(() => {
      setStripWidth(strip.clientWidth);
      drawLeaders();
    });
    observer.observe(strip);
    observer.observe(hero);
    return () => observer.disconnect();
  }, [drawLeaders]);

  const onMarkKey = (e: KeyboardEvent<HTMLAnchorElement>, index: number) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = stepAim(aimable, index, e.key === "ArrowRight" ? 1 : -1);
    markRefs.current.get(next)?.focus();
  };

  const ruler = stripWidth > 0 ? rulerTicks(0, stripWidth / image.width, stripWidth, image.width, LABEL_GAP_PX * (remPx() / 16)) : null;
  const top = lensTicks(field.x, field.side, image.width, LENS_PX, LABEL_GAP_PX * 0.75);
  const left = lensTicks(field.y, field.side, image.height, LENS_PX, LABEL_GAP_PX * 0.5);
  const route = aimable.map((i) => stopTarget(stops[i])!);
  const count = stops.length;
  const storyHref = (index: number) => `/${journeySlug}/${storySearch(index)}`;

  return (
    <section ref={heroRef} className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 id="hero-title" className={styles.title}>
          Fly into one giant image.
        </h1>
        <p className={styles.promise}>
          Solaria guides you through a giant Hubble image, one stop at a time, then lets you zoom anywhere.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primary} href={`/${journeySlug}/`}>
            Begin the journey
            <LuArrowRight aria-hidden />
          </Link>
          <Link className={styles.secondary} href={`/${image.id}/`}>
            Explore freely
          </Link>
        </div>
      </div>

      {/* The strip comes before the readout in the DOM, so Tab reaches the stops before "Go to stop". */}
      <div className={styles.panorama} style={{ ["--ratio" as string]: image.width / image.height }}>
        <p className={styles.caption}>Whole panorama. Aim the lens at a stop.</p>
        <div className={styles.stripRuler} aria-hidden>
          {ruler?.minor.map((at) => (
            <span key={`m${at}`} className={styles.minor} style={{ left: pct((at / stripWidth) * 100) }} />
          ))}
          {ruler?.major.map(({ value, at }) => (
            <span key={value} className={styles.major} style={{ left: pct((at / stripWidth) * 100) }}>
              <span className={styles.label}>{formatInt(value)}</span>
            </span>
          ))}
        </div>
        <div
          ref={stripRef}
          className={styles.strip}
          data-theme="dark"
          role="group"
          aria-label="Whole panorama, with a close-up lens"
          onMouseLeave={scheduleReturn}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) scheduleReturn();
          }}
        >
          <Image
            className={styles.poster}
            src={`${tileBaseUrl}/${image.id}/preview.jpg`}
            alt={POSTER_ALT}
            width={image.tiles.preview.width}
            height={image.tiles.preview.height}
            unoptimized
            preload
            fetchPriority="high"
          />
          <svg className={styles.route} viewBox={`0 0 ${image.width} ${image.height}`} preserveAspectRatio="none" aria-hidden>
            <polyline className={styles.routeHalo} points={route.map((p) => `${p.x},${p.y}`).join(" ")} />
            <polyline className={styles.routeAhead} points={route.map((p) => `${p.x},${p.y}`).join(" ")} />
          </svg>
          <div
            ref={boxRef}
            className={styles.viewBox}
            style={{ left: pct(box.left), top: pct(box.top), width: pct(box.width), height: pct(box.height) }}
            aria-hidden
          />
          {aimable.map((index) => {
            const p = stopTarget(stops[index])!;
            const u = p.x / image.width;
            return (
              <Link
                key={stops[index].id}
                ref={(el) => {
                  if (el) markRefs.current.set(index, el);
                  else markRefs.current.delete(index);
                }}
                href={storyHref(index)}
                className={styles.mark}
                style={{ left: pct(u * 100), top: pct((p.y / image.height) * 100) }}
                data-current={index === aim || undefined}
                data-flip={u > 0.92 || undefined}
                tabIndex={index === aim ? 0 : -1}
                aria-label={`Open stop ${stopNumber(index)}`}
                onMouseEnter={() => aimAt(index)}
                onFocus={() => aimAt(index)}
                onKeyDown={(e) => onMarkKey(e, index)}
              >
                <Bracket />
                <span className={styles.markTag} aria-hidden>
                  {stopNumber(index)}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <div className={styles.lensArea}>
        <div className={styles.lens}>
          <div className={`${styles.lensRuler} ${styles.lensRulerTop}`} aria-hidden>
            {top.minor.map((at) => (
              <span key={`m${at}`} className={styles.minor} style={{ left: pct(at) }} />
            ))}
            {top.major.map(({ value, at }) => (
              <span key={value} className={styles.major} style={{ left: pct(at) }}>
                <span className={styles.label}>{formatInt(value)}</span>
              </span>
            ))}
          </div>
          <div className={`${styles.lensRuler} ${styles.lensRulerLeft}`} aria-hidden>
            {left.minor.map((at) => (
              <span key={`m${at}`} className={styles.minor} style={{ top: pct(at) }} />
            ))}
            {left.major.map(({ value, at }) => (
              <span key={value} className={styles.major} style={{ top: pct(at) }}>
                <span className={styles.label}>{formatInt(value)}</span>
              </span>
            ))}
          </div>
          <div ref={wellRef} className={styles.well} data-theme="dark" aria-hidden>
            {layers.map(({ stop, n }, i) => (
              <div key={n} className={styles.layer} data-enter={i > 0 || undefined}>
                {lensTiles(image.tiles, lensField(stops[stop], image), LENS_DEVICE_PX).map((t) => (
                  <Image
                    key={t.key}
                    src={tileUrl(tileBaseUrl, image.id, t.level, t.col, t.row)}
                    alt=""
                    width={256}
                    height={256}
                    unoptimized
                    fetchPriority="low"
                    className={styles.tile}
                    style={{ left: pct(t.left), top: pct(t.top), width: pct(t.width), height: pct(t.height) }}
                  />
                ))}
              </div>
            ))}
            <span className={styles.crosshair} />
            <span className={styles.lensTag}>Stop {stopNumber(aim)}</span>
          </div>
          <span className={styles.frame} aria-hidden />
        </div>

        <div className={styles.readout}>
          <p className={styles.readoutLabel}>
            Lens, aimed at stop {stopNumber(aim)} of {stopNumber(count - 1)}
          </p>
          <p className={styles.readoutTitle}>{stops[aim].title}</p>
          <dl className={styles.values}>
            <div>
              <dt>Zoom</dt>
              <dd>{formatZoom(field.zoom)}</dd>
            </div>
            <div>
              <dt>Field</dt>
              <dd>
                {formatInt(field.side)} × {formatInt(field.side)} px
              </dd>
            </div>
            <div>
              <dt>Center x</dt>
              <dd>{formatInt(field.x)} px</dd>
            </div>
            <div>
              <dt>Center y</dt>
              <dd>{formatInt(field.y)} px</dd>
            </div>
          </dl>
          <p className={styles.hint}>Hover or focus a stop on the panorama to aim the lens. Press Enter to fly there.</p>
          <Link className={styles.go} href={storyHref(aim)}>
            Go to stop {stopNumber(aim)}
            <LuArrowRight aria-hidden />
          </Link>
          <p ref={liveRef} className={styles.visuallyHidden} aria-live="polite" />
        </div>
      </div>

      <p className={styles.credit}>{credit}</p>

      <svg className={styles.leaders} data-testid="leaders" aria-hidden>
        <path ref={leaderHalo} className={styles.leaderHalo} />
        <path ref={leaderLine} className={styles.leaderLine} />
      </svg>
    </section>
  );
};

export default HomeHero;
