import Link from "next/link";
import OutLink from "@/components/OutLink";
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

// Credit lines come unaltered from the validated source records (data/sources). Mock fixtures,
// loaded in development and the end-to-end build, are never credited.
const credits = () => {
  const { images, sources } = getContent();
  const lines = new Map<string, string[]>();
  for (const image of images.filter((i) => !i.mock)) {
    const source = sources.find((s) => s.id === image.sourceId);
    // Images that share a credit (the seven SDO channels) share one line, named in file order.
    if (source) lines.set(source.credit, [...(lines.get(source.credit) ?? []), image.title]);
  }
  return [...lines].map(([credit, titles]) => ({ credit, titles }));
};

const Footer = () => (
  <footer className={styles.footer}>
    <div className={styles.credits}>
      {credits().map(({ credit, titles }) => (
        <p key={credit} data-credit>
          {titles.join(", ")}: {credit}
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
        <OutLink key={href} href={href} hiddenClassName={styles.hidden} icon>
          {label}
        </OutLink>
      ))}
    </nav>
  </footer>
);

export default Footer;
