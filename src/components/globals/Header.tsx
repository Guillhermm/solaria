import Link from "next/link";
import Search from "@/components/search/Search";
import { getContent } from "@/content/load";
import { buildSearchIndex } from "@/search/build";
import ThemeSwitcher from "../ThemeSwitcher";
import styles from "./Header.module.css";

const Header = () => (
  <header className={styles.header}>
    <Link href="/" className={styles.wordmark}>
      <span aria-hidden className={styles.mark} />
      Solaria
    </Link>
    <nav aria-label="Main" className={styles.nav}>
      <Search variant="header" index={buildSearchIndex(getContent())} />
      <Link href="/#journeys">Journeys</Link>
      <Link href="/about/">About</Link>
      <ThemeSwitcher />
    </nav>
  </header>
);

export default Header;
