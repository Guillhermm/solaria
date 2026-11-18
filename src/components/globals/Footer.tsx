import Link from "next/link";
import OutLink from "@/components/OutLink";
import { getContent } from "@/content/load";
import AnchorLink from "./AnchorLink";
import styles from "./Footer.module.css";

const pages = [
  { href: "/about/", label: "About" },
  { href: "/about/#credits", label: "Sources and credits" },
  { href: "/about/#accessibility", label: "Accessibility" },
];

export const AUTHORS = [
  { name: "Kauê Melo", href: "https://github.com/kauemelo01" },
  { name: "Guilherme Almeida Zeni", href: "https://github.com/Guillhermm" },
];

const external = [
  { href: "https://github.com/Guillhermm/solaria", label: "Source code" },
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
      <p className={styles.note} data-authors>
        Made by{" "}
        {AUTHORS.map(({ name, href }, i) => (
          <span key={href}>
            {i > 0 && " and "}
            <OutLink href={href} hiddenClassName={styles.hidden}>
              {name}
            </OutLink>
          </span>
        ))}
        .
      </p>
    </div>
    <nav aria-label="Footer" className={styles.links}>
      {pages.map(({ href, label }) =>
        href.includes("#") ? (
          <AnchorLink key={href} href={href}>
            {label}
          </AnchorLink>
        ) : (
          <Link key={href} href={href}>
            {label}
          </Link>
        ),
      )}
      {external.map(({ href, label }) => (
        <OutLink key={href} href={href} hiddenClassName={styles.hidden} icon>
          {label}
        </OutLink>
      ))}
    </nav>
  </footer>
);

export default Footer;
