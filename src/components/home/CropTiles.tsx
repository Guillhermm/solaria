"use client";

import { type CSSProperties, useEffect, useRef } from "react";

interface Tile {
  key: string;
  src: string;
  style: CSSProperties;
}

// design.md 15.3, W12 and 5.8: a tile that fails is hidden, so the dark canvas shows instead of a
// broken-image icon. A tile that failed before hydration is caught on mount.
const CropTiles = ({ tiles, className }: { tiles: Tile[]; className: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    for (const img of ref.current?.querySelectorAll("img") ?? []) if (img.complete && img.naturalWidth === 0 && img.src) img.hidden = true;
  }, []);
  return (
    <div ref={ref}>
      {tiles.map((t) => (
        // A tile of the pyramid, placed by percent: next/image adds nothing here.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={t.key}
          src={t.src}
          alt=""
          width={256}
          height={256}
          loading="lazy"
          decoding="async"
          className={className}
          style={t.style}
          onError={(e) => {
            e.currentTarget.hidden = true;
          }}
        />
      ))}
    </div>
  );
};

export default CropTiles;
