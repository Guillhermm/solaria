import type { Ref } from "react";
import { LuArrowUpRight, LuX } from "react-icons/lu";
import type { Info } from "@/viewer/info";
import styles from "./InfoPanel.module.css";

interface InfoPanelProps {
  id: string;
  info: Info;
  onClose: () => void;
  titleRef: Ref<HTMLHeadingElement>;
}

// Everything here comes from the manifest and its source record (src/viewer/info.ts).
const InfoPanel = ({ id, info, onClose, titleRef }: InfoPanelProps) => (
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
    <a className={styles.source} href={info.sourceUrl} target="_blank" rel="noopener noreferrer">
      Source page
      <LuArrowUpRight aria-hidden />
      <span className={styles.hidden}>(opens in a new tab)</span>
    </a>
  </div>
);

export default InfoPanel;
