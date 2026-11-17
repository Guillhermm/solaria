import type { Ref } from "react";
import type { FeatureLabel } from "@/content/types";
import { LuX } from "react-icons/lu";
import OutLink from "@/components/OutLink";
import type { Info } from "@/viewer/info";
import styles from "./InfoPanel.module.css";

interface InfoPanelProps {
  id: string;
  info: Info;
  onClose: () => void;
  titleRef: Ref<HTMLHeadingElement>;
  labels?: FeatureLabel[];
  onShowLabel?: (id: string) => void;
}

// Everything here comes from the manifest and its source record (src/viewer/info.ts).
const InfoPanel = ({ id, info, onClose, titleRef, labels = [], onShowLabel }: InfoPanelProps) => (
  <div id={id} className={styles.panel} role="region" aria-labelledby={`${id}-title`}>
    <div className={styles.head}>
      <p className={styles.eyebrow}>About this image</p>
      <button type="button" className={styles.close} onClick={onClose} aria-label="Close details">
        <LuX aria-hidden />
      </button>
    </div>
    <h2 id={`${id}-title`} ref={titleRef} tabIndex={-1} className={styles.title}>
      {info.title}
    </h2>
    <dl className={styles.fields}>
      {info.fields.map((field) => (
        <div key={field.label} className={styles.field}>
          <dt>{field.label}</dt>
          <dd>
            {field.values.map((value) => (
              <span key={value} className={styles.value}>
                {value}
              </span>
            ))}
            {field.draft && <span className={styles.draft}>Draft</span>}
          </dd>
        </div>
      ))}
      <div className={styles.field}>
        <dt>Credit</dt>
        <dd>{info.credit}</dd>
      </div>
    </dl>
    {info.caveats.length > 0 && (
      <section className={styles.caveats} aria-labelledby={`${id}-caveats`}>
        <h3 id={`${id}-caveats`} className={styles.label}>
          Caveats
        </h3>
        <ul>
          {info.caveats.map((caveat) => (
            <li key={caveat}>{caveat}</li>
          ))}
        </ul>
      </section>
    )}
    {/* design.md 14.2, L23: the text alternative for the labels on the image, and the way to a
        label whose chip is hidden. */}
    {labels.length > 0 && (
      <section className={styles.labels} aria-labelledby={`${id}-labels`}>
        <h3 id={`${id}-labels`} className={styles.label}>
          Labeled features
        </h3>
        <ul>
          {labels.map((l) => (
            <li key={l.id}>
              <div>
                <p className={styles.labelText}>{l.text}</p>
                <p className={styles.labelBody}>{l.description}</p>
              </div>
              <button type="button" className={styles.show} onClick={() => onShowLabel?.(l.id)}>
                Show<span className={styles.hidden}> {l.text}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    )}
    <OutLink className={styles.source} href={info.sourceUrl} hiddenClassName={styles.hidden} icon plain={info.sourceUrl}>
      Source page
    </OutLink>
  </div>
);

export default InfoPanel;
