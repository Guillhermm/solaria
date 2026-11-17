import Link from "next/link";
import ThemeSwitcher from "../ThemeSwitcher";
import styles from "./Header.module.css";

const Header = () => (
  <header className={styles.header}>
    <Link href="/" className={styles.wordmark}>
      <span aria-hidden className={styles.mark} />
      Solaria
    </Link>
    <nav aria-label="Main" className={styles.nav}>
      <Link href="/#journeys">Journeys</Link>
      <ThemeSwitcher />
    </nav>
  </header>
);

export default Header;
