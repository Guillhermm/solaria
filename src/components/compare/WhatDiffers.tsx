"use client";

import { useId } from "react";
import { LuX } from "react-icons/lu";
import type { Difference } from "@/content/types";
import styles from "./Compare.module.css";

interface WhatDiffersProps {
  note: string; // the pair's whatDiffers, plain text; blank lines separate paragraphs
  differs: Record<Difference, boolean>;
  caveats: string[]; // both images' caveats
  draft: boolean;
}

const NAMES: Record<Difference, string> = {
  instrument: "Instrument",
  band: "Band",
  date: "Date",
  illumination: "Illumination",
  geometry: "Viewing geometry",
  processing: "Processing",
};

// design.md 5.6: every pair carries its "What differs?" note. Everything here is the pair's and
// the images' validated text, rendered as text nodes. A native popover: Esc and a click
// outside close it, and focus returns to the button.
const WhatDiffers = ({ note, differs, caveats, draft }: WhatDiffersProps) => {
  const id = useId();
  const changed = (Object.keys(NAMES) as Difference[]).filter((k) => differs[k]);
  return (
    <>
      <button type="button" className={styles.textButton} popoverTarget={id} aria-haspopup="dialog">
        What differs?
      </button>
      <div id={id} popover="auto" role="dialog" aria-labelledby={`${id}-title`} className={`${styles.note} ${styles.glass}`} data-testid="what-differs">
        <div className={styles.noteHead}>
          <h2 id={`${id}-title`} className={styles.noteTitle}>
            What differs?
            {draft && <span className={styles.draft}>Draft</span>}
          </h2>
          <button type="button" className={styles.close} popoverTarget={id} popoverTargetAction="hide" aria-label="Close">
            <LuX aria-hidden />
          </button>
        </div>
        {note.split(/\n\s*\n/).map((p) => (
          <p key={p} className={styles.noteText}>
            {p}
          </p>
        ))}
        {changed.length > 0 && (
          <p className={styles.noteDiffers}>
            <span className={styles.creditLabel}>Differs</span> {changed.map((k) => NAMES[k]).join(", ")}
          </p>
        )}
        {caveats.length > 0 && (
          <ul className={styles.noteCaveats} aria-label="Caveats">
            {caveats.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
};

export default WhatDiffers;
