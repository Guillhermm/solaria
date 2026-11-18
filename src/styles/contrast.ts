// WCAG 2.2 contrast ratio, https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio

export type Rgba = { r: number; g: number; b: number; a: number };

export const parseColor = (value: string): Rgba => {
  const v = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{6})$/.exec(v);
  if (hex) {
    const n = parseInt(hex[1], 16);
    return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  const rgb = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+)\s*)?\)$/.exec(v);
  if (rgb) {
    return { r: +rgb[1], g: +rgb[2], b: +rgb[3], a: rgb[4] === undefined ? 1 : +rgb[4] };
  }
  throw new Error(`Unsupported color: ${value}`);
};

// Alpha-composite a translucent color over an opaque one.
export const over = (top: Rgba, bottom: Rgba): Rgba => ({
  r: top.r * top.a + bottom.r * (1 - top.a),
  g: top.g * top.a + bottom.g * (1 - top.a),
  b: top.b * top.a + bottom.b * (1 - top.a),
  a: 1,
});

const channel = (c: number) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

export const luminance = ({ r, g, b }: Rgba) =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export const contrastRatio = (a: Rgba, b: Rgba) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
