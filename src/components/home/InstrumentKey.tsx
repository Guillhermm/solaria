import { bracketPath } from "@/viewer/route";
import { formatInt, formatZoom } from "@/viewer/view";
import styles from "./InstrumentKey.module.css";

const ITEMS = [
  { term: "Stop", text: "A place the journey visits. The amber one is where you are now; the line shows the route.", glyph: "stop" },
  { term: "View box", text: "The part of the whole image on your screen right now.", glyph: "box" },
  { term: "Lens", text: "A close look at one stop, tied by two lines to its view box on the whole image.", glyph: "lens" },
  { term: "Zoom", text: "How many times closer you are than the whole image fitted to the screen.", glyph: "zoom" },
  {
    term: "Position",
    text: "The pixel at the center of your view, counted from the top-left corner of the image file.",
    glyph: "position",
  },
] as const;

interface Sample {
  zoom: number;
  x: number;
}

// Small drawings of each instrument element; they illustrate, the words carry the meaning.
// The two figures are the lens's first stop, so they are real readouts, not decoration.
const Glyph = ({ kind, sample }: { kind: (typeof ITEMS)[number]["glyph"]; sample: Sample }) => {
  switch (kind) {
    case "stop":
      return (
        <svg viewBox="0 0 64 28" className={styles.glyph}>
          <path className={styles.current} d={bracketPath(20, 6)} transform="translate(14 14)" />
          <path className={styles.white} d={bracketPath(16, 5)} transform="translate(46 14)" />
        </svg>
      );
    case "box":
      return (
        <svg viewBox="0 0 64 28" className={styles.glyph}>
          <rect className={styles.well} x="0" y="4" width="64" height="20" />
          <rect className={styles.white} x="24" y="8" width="16" height="12" />
        </svg>
      );
    case "lens":
      return (
        <svg viewBox="0 0 64 28" className={styles.glyph}>
          <rect className={styles.white} x="2" y="10" width="8" height="8" />
          <path className={styles.white} d="M14 14H26" />
          <rect className={styles.well} x="34" y="2" width="24" height="24" />
          <path className={styles.current} d={bracketPath(28, 7)} transform="translate(46 14)" />
        </svg>
      );
    case "zoom":
      return <span className={styles.figure}>{formatZoom(sample.zoom)}</span>;
    case "position":
      return <span className={styles.figure}>x {formatInt(sample.x)}</span>;
  }
};

const InstrumentKey = ({ sample }: { sample: Sample }) => (
  <section className={styles.key} aria-labelledby="key-title">
    <h2 id="key-title" className={styles.heading}>
      Reading the instrument
    </h2>
    <dl className={styles.items}>
      {ITEMS.map(({ term, text, glyph }) => (
        <div key={term} className={styles.item}>
          <dt>
            <span className={styles.art} aria-hidden>
              <Glyph kind={glyph} sample={sample} />
            </span>
            {term}
          </dt>
          <dd>{text}</dd>
        </div>
      ))}
    </dl>
  </section>
);

export default InstrumentKey;
