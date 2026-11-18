import Link from "next/link";
import styles from "./not-found.module.css";

const NotFound = () => (
  <main className={styles.page} data-theme="dark">
    <p className={styles.code}>404</p>
    <h1 className={styles.title}>Nothing at these coordinates.</h1>
    <Link href="/" className={styles.back}>
      Back to home
    </Link>
  </main>
);

export default NotFound;
