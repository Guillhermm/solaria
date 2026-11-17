"use client";

import { useSyncExternalStore } from "react";
import { attractOn, isKiosk, subscribeAttract, subscribeKiosk } from "./kiosk";

const subscribe = (onChange: () => void) => subscribeKiosk(document.documentElement, onChange);

// False on the server and in the first render: the static HTML is never a kiosk page.
export const useKiosk = () => useSyncExternalStore(subscribe, () => isKiosk(document.documentElement), () => false);

export const useAttract = () => {
  const kiosk = useKiosk();
  const on = useSyncExternalStore(subscribeAttract, attractOn, () => false);
  return kiosk && on;
};
