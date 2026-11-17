"use client";

import type { ReactNode } from "react";
import { LuArrowUpRight } from "react-icons/lu";
import { useKiosk } from "@/kiosk/useKiosk";

interface OutLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  hiddenClassName: string; // the module's visually hidden class, for the new-tab note
  icon?: boolean;
  plain?: ReactNode; // what a kiosk shows instead, when the link text alone means nothing
}

// A link that leaves the app, in a new tab; in a kiosk it is plain text (design.md 14.3, K3).
const OutLink = ({ href, children, className, hiddenClassName, icon = false, plain }: OutLinkProps) => {
  const kiosk = useKiosk();
  if (kiosk) return <span className={className}>{plain ?? children}</span>;
  return (
    <a className={className} href={href} target="_blank" rel="noopener noreferrer">
      {children}
      {icon && <LuArrowUpRight aria-hidden />}
      <span className={hiddenClassName}> (opens in a new tab)</span>
    </a>
  );
};

export default OutLink;
