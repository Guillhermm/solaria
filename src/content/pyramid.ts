// Level sizes match libvips (nearest pixel); tile counts match OpenSeadragon, which divides
// the unrounded size. A level where the two disagree is caught by the tiler.
export const levelSize = (w: number, h: number, maxLevel: number, level: number) => {
  const d = 2 ** (maxLevel - level);
  return { width: Math.max(1, Math.round(w / d)), height: Math.max(1, Math.round(h / d)) };
};

export const tileCount = (w: number, h: number, tileSize: number, maxLevel: number, level: number) => {
  const d = 2 ** (maxLevel - level);
  return { cols: Math.ceil(w / d / tileSize), rows: Math.ceil(h / d / tileSize) };
};

// OpenSeadragon asks for `cols` x `rows` tiles; the level image must fill that grid with a
// non-empty last tile in each direction, or some requested tile would not exist.
export const assertGrid = (
  size: { width: number; height: number },
  grid: { cols: number; rows: number },
  tileSize: number,
  label: string,
) => {
  const lastW = size.width - (grid.cols - 1) * tileSize;
  const lastH = size.height - (grid.rows - 1) * tileSize;
  if (lastW < 1 || lastW > tileSize || lastH < 1 || lastH > tileSize) {
    throw new Error(
      `${label}: a ${size.width} x ${size.height} level does not fit the ${grid.cols} x ${grid.rows} tile grid OpenSeadragon expects`,
    );
  }
};

// The Home poster on phones (L-05) is one pyramid level stitched into a single JPEG: the
// coarsest level at least `minWidth` pixels wide, so a 390 px phone at 3x gets 1 170 pixels.
export const POSTER_MIN_WIDTH = 390 * 3;

export const posterLevel = (w: number, h: number, maxLevel: number, minWidth = POSTER_MIN_WIDTH) => {
  for (let level = 0; level < maxLevel; level++) {
    if (levelSize(w, h, maxLevel, level).width >= minWidth) return level;
  }
  return maxLevel;
};
