"use client";

import { useCallback, useSyncExternalStore } from "react";
import { otherTheme, readTheme, setTheme, subscribeTheme, type Theme } from "./theme";

const subscribe = (onChange: () => void) => subscribeTheme(document.documentElement, onChange);
const getSnapshot = () => readTheme(document.documentElement);
// Unknown on the server: the static HTML cannot know the visitor's theme.
const getServerSnapshot = () => null;

export const useTheme = (): [Theme | null, () => void] => {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const toggle = useCallback(() => {
    const root = document.documentElement;
    setTheme(root, otherTheme(readTheme(root)), window.localStorage);
  }, []);
  return [theme, toggle];
};
