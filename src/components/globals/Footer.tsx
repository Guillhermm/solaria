import Link from "next/link";
import { LuArrowUpRight } from "react-icons/lu";
import { getContent } from "@/content/load";
import styles from "./Footer.module.css";

const pages = [
  { href: "/about/", label: "About" },
  { href: "/about/#credits", label: "Sources and credits" },
  { href: "/about/#accessibility", label: "Accessibility" },
];

const external = [
  { href: "https://github.com/Guillhermm/nasa-2025-solaria", label: "Source code" },
  { href: "https://www.spaceappschallenge.org/2025/find-a-team/solaria4/", label: "Space Apps entry" },
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
      <p className={styles.note}>Solaria is an independent project. It is not endorsed by NASA or ESA.</p>
    </div>
    <nav aria-label="Footer" className={styles.links}>
      {pages.map(({ href, label }) => (
        <Link key={href} href={href}>
          {label}
        </Link>
      ))}
      {external.map(({ href, label }) => (
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
