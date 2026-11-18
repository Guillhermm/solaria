import Link from "next/link";
import ThemeSwitcher from "../ThemeSwitcher";
import styles from "./Header.module.css";

const Header = () => (
  <header className={styles.header}>
    <Link href="/" className={styles.wordmark}>
      <span aria-hidden className={styles.mark} />
      Solaria
    </Link>
    <ThemeSwitcher />
  </header>
);

export default Header;
