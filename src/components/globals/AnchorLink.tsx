"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type MouseEvent, type ReactNode, useLayoutEffect, useRef } from "react";
import { focusTarget, parseAnchor, samePath, scrollBehavior } from "@/navigation/anchor";

// Scrolls to the target (its scroll-margin-top clears the sticky header), smoothly unless the
// visitor asked for reduced motion, then moves focus to its heading without scrolling again.
const land = (id: string, fromTop: boolean) => {
  const target = document.getElementById(id);
  if (!target) return;
  if (fromTop) window.scrollTo({ top: 0, behavior: "instant" });
  target.scrollIntoView({ behavior: scrollBehavior(window.matchMedia("(prefers-reduced-motion: reduce)").matches), block: "start" });
  const heading = focusTarget(target);
  if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
  heading.dataset.anchorHeading = "";
  heading.focus({ preventScroll: true });
};

// A link to a section of a page. Next leaves focus alone on navigation, and arriving from another
// page it would jump instantly, so the link takes the scroll over (scroll={false}). It has to live
// in the shared layout, which survives the route change and sees the new page commit.
const AnchorLink = ({ href, className, children }: { href: string; className?: string; children: ReactNode }) => {
  const pathname = usePathname();
  const pending = useRef<string | null>(null);

  useLayoutEffect(() => {
    const id = pending.current;
    if (!id) return;
    pending.current = null;
    land(id, true);
  }, [pathname]);

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    const anchor = parseAnchor(href);
    if (!anchor || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (samePath(anchor.path, pathname)) land(anchor.id, false);
    else pending.current = anchor.id;
  };

  return (
    <Link href={href} scroll={false} className={className} onClick={onClick}>
      {children}
    </Link>
  );
};

export default AnchorLink;
