import { FaGithub } from "react-icons/fa";
import { BsPeople, BsWindowDock } from "react-icons/bs";
import styles from "./Footer.module.css";

const links = [
  { href: "https://www.spaceappschallenge.org/2025/find-a-team/solaria4/", label: "Solaria Team", Icon: BsPeople },
  { href: "https://www.spaceappschallenge.org/2025/challenges/embiggen-your-eyes/", label: "See full challenge description", Icon: BsWindowDock },
  { href: "https://github.com/Guillhermm/nasa-2025-solaria", label: "See full code", Icon: FaGithub },
];

const Footer = () => (
  <footer className={styles.footer}>
    <p className={styles.copy}>&copy; {new Date().getFullYear()}. All rights reserved.</p>
    <nav aria-label="Footer" className={styles.links}>
      {links.map(({ href, label, Icon }) => (
        <a key={href} href={href} target="_blank" rel="noopener noreferrer">
          <Icon aria-hidden />
          {label}
        </a>
      ))}
    </nav>
  </footer>
);

export default Footer;
