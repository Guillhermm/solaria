"use client";

import { LuMoon, LuSun } from "react-icons/lu";
import { useKiosk } from "@/kiosk/useKiosk";
import { useTheme } from "@/theme/useTheme";
import styles from "./ThemeSwitcher.module.css";

const ThemeSwitcher = () => {
  const [theme, toggle] = useTheme();
  const kiosk = useKiosk();
  const next = theme === "light" ? "dark" : "light";
  // K2: a kiosk is always dark.
  if (kiosk) return null;

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
    >
      {theme === "light" ? <LuMoon aria-hidden /> : <LuSun aria-hidden />}
    </button>
  );
};

export default ThemeSwitcher;
