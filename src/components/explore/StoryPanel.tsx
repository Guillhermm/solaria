import Link from "next/link";
import { type PointerEvent, useRef } from "react";
import { LuArrowLeft, LuArrowRight } from "react-icons/lu";
import OutLink from "@/components/OutLink";
import type { Journey } from "@/content/types";
import { paragraphs, stopNumber } from "@/viewer/story";
import styles from "./StoryPanel.module.css";

interface StoryPanelProps {
  journey: Journey;
  index: number;
  seen: ReadonlySet<number>;
  mission: string[];
  onGo: (index: number) => void;
  onExplore: () => void;
  collapsed: boolean; // phone: the sheet is down to the stop's title
}

const SWIPE_REM = 2.5;

// design.md 5.3 and 5.4: the left column on desktop, the stop card of the bottom sheet on a
// phone. One tree for both; the stylesheet shows only the current stop on a phone.
const StoryPanel = ({ journey, index, seen, mission, onGo, onExplore, collapsed }: StoryPanelProps) => {
  const { stops } = journey;
  const count = stops.length;
  const last = index === count - 1;
  const start = useRef<{ x: number; y: number } | null>(null);

  // design.md 5.4: swipe the card sideways to change stop; the buttons do the same (WCAG 2.5.7).
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === "mouse") return;
    start.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e: PointerEvent) => {
    const from = start.current;
    start.current = null;
    if (!from) return;
    const dx = e.clientX - from.x;
    const dy = e.clientY - from.y;
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    if (Math.abs(dx) < SWIPE_REM * rem || Math.abs(dx) < Math.abs(dy)) return;
    const next = index + (dx < 0 ? 1 : -1);
    if (next >= 0 && next < count) onGo(next);
  };

  return (
    <section
      className={styles.panel}
      aria-labelledby="story-title"
      data-testid="story"
      data-collapsed={collapsed || undefined}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (start.current = null)}
    >
      <div className={styles.brand}>
        <Link href="/" className={styles.iconButton} aria-label="Back to home">
          <LuArrowLeft aria-hidden />
        </Link>
        <Link href="/" className={styles.wordmark}>
          <span aria-hidden className={styles.mark} />
          Solaria
        </Link>
      </div>

      {mission.length > 0 && <p className={styles.mission}>{mission.join(" · ")}</p>}
      <h1 id="story-title" className={styles.title}>
        {journey.title}
      </h1>

      <div className={styles.route}>
        <p className={styles.routeHead}>
          <span className={styles.routeLabel}>Route</span>
          <span data-testid="stop-count">
            <span className={styles.routeLabel}>Stop </span>
            {stopNumber(index)} / {stopNumber(count - 1)}
          </span>
        </p>
        <ol className={styles.segments} aria-hidden>
          {stops.map((stop, i) => (
            <li key={stop.id} data-state={i === index ? "current" : i < index || seen.has(i) ? "seen" : undefined} />
          ))}
        </ol>
      </div>

      <ol className={styles.stops}>
        {stops.map((stop, i) => {
          const current = i === index;
          return (
            <li key={stop.id} className={styles.stop} data-current={current || undefined}>
              {current ? (
                <div className={styles.card} aria-current="step">
                  <h2 className={styles.stopTitle}>
                    <span className={styles.number}>{stopNumber(i)}</span>
                    {stop.title}
                  </h2>
                  <div className={styles.body} data-stop-body>
                    {paragraphs(stop.body).map((p) => (
                      <p key={p}>{p}</p>
                    ))}
                  </div>
                  <ul className={styles.sources} aria-label="Sources">
                    {stop.sources.map((source) => (
                      <li key={source.url}>
                        <OutLink href={source.url} hiddenClassName={styles.hidden} icon>
                          {source.label}
                        </OutLink>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <button type="button" className={styles.stopButton} onClick={() => onGo(i)}>
                  <span className={styles.number}>{stopNumber(i)}</span>
                  <span className={styles.stopName}>{stop.title}</span>
                  {seen.has(i) && <span className={styles.seen}>Seen</span>}
                </button>
              )}
            </li>
          );
        })}
      </ol>

      <div className={styles.nav}>
        <button
          type="button"
          className={styles.back}
          onClick={() => onGo(index - 1)}
          disabled={index === 0}
          aria-label="Previous stop"
        >
          <LuArrowLeft aria-hidden />
        </button>
        {last ? (
          <button type="button" className={styles.next} onClick={onExplore}>
            Explore freely
            <LuArrowRight aria-hidden />
          </button>
        ) : (
          <button type="button" className={styles.next} onClick={() => onGo(index + 1)}>
            Next: stop {stopNumber(index + 1)}
            <LuArrowRight aria-hidden />
          </button>
        )}
      </div>
    </section>
  );
};

export default StoryPanel;
