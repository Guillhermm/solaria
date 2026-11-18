"use client";

import { LuMoon, LuSun } from "react-icons/lu";
import { useTheme } from "@/theme/useTheme";

const ThemeSwitcher = () => {
  const [theme, toggle] = useTheme();
  const next = theme === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      className="theme-switcher"
      onClick={toggle}
      aria-label={`Switch to ${next} theme`}
    >
      {theme === "light" ? <LuMoon aria-hidden /> : <LuSun aria-hidden />}
    </button>
  );
};

export default ThemeSwitcher;
