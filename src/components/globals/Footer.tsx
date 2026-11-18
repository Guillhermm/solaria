import { LuArrowUpRight } from "react-icons/lu";
import { getContent } from "@/content/load";
import styles from "./Footer.module.css";

const links = [
  { href: "https://www.spaceappschallenge.org/2025/find-a-team/solaria4/", label: "Team" },
  { href: "https://www.spaceappschallenge.org/2025/challenges/embiggen-your-eyes/", label: "Challenge" },
  { href: "https://github.com/Guillhermm/nasa-2025-solaria", label: "Source code" },
];

// Credit lines come unaltered from the validated source records (data/sources).
const credits = () => {
  const { images, sources } = getContent();
  return images.flatMap((image) => {
    const source = sources.find((s) => s.id === image.sourceId);
    return source ? [{ id: image.id, title: image.title, credit: source.credit }] : [];
  });
};

const Footer = () => (
  <footer className={styles.footer}>
    <div className={styles.credits}>
      {credits().map(({ id, title, credit }) => (
        <p key={id}>
          {title}: {credit}
        </p>
      ))}
    </div>
    <nav aria-label="Footer" className={styles.links}>
      {links.map(({ href, label }) => (
        <a key={href} href={href} target="_blank" rel="noopener noreferrer">
          {label}
          <LuArrowUpRight aria-hidden />
          <span className={styles.hidden}>(opens in a new tab)</span>
        </a>
      ))}
    </nav>
  </footer>
);

export default Footer;
