import Link from "next/link";
import Image from "next/image";
import ThemeSwitcher from "../ThemeSwitcher";
import profile from "../../assets/logos/logo.png";
import styles from "./Header.module.css";

const Header = () => (
  <header className={styles.header}>
    <Link href="/" className={styles.brand}>
      <Image aria-hidden src={profile} alt="" width={40} height={40} className={styles.logo} />
      Solaria App
    </Link>
    <ThemeSwitcher />
  </header>
);

export default Header;
