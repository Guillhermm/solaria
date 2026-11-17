import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import sharp from "sharp";
import { GROUND } from "../src/app/theme-color";

// --text of the dark theme in src/styles/tokens.css: the mark is --text on --ground.
export const INK = "#e9ecf2";

// The header mark (.mark in Header.module.css and Explore.module.css) in CSS pixels: a
// 10px border-box square with a 1.5px border and a 1px radius, turned 45 degrees. The
// stroke runs along the border's middle, so its path is 0.75px in, with radius 1 - 0.75.
const SIDE = 10;
const BORDER = 1.5;
const RADIUS = 1;
// Corner to corner once turned.
export const DIAGONAL = SIDE * Math.SQRT2;

// `diagonal` is the share of the tile the turned square spans; `radius` the tile's corner
// radius as a share of its side (0 for full-bleed icons the platform masks itself).
export const tileSvg = (diagonal: number, radius: number) => {
  const view = DIAGONAL / diagonal;
  const offset = (view - SIDE) / 2;
  const inset = BORDER / 2;
  const fmt = (n: number) => Number(n.toFixed(4));
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${fmt(view)} ${fmt(view)}">`,
    `<rect width="${fmt(view)}" height="${fmt(view)}" rx="${fmt(view * radius)}" fill="${GROUND}"/>`,
    `<rect x="${fmt(offset + inset)}" y="${fmt(offset + inset)}" width="${SIDE - BORDER}" height="${SIDE - BORDER}"`,
    ` rx="${RADIUS - inset}" fill="none" stroke="${INK}" stroke-width="${BORDER}"`,
    ` transform="rotate(45 ${fmt(view / 2)} ${fmt(view / 2)})"/>`,
    `</svg>\n`,
  ].join("");
};

// The browser-tab and "any" icons: a rounded dark tile, the mark across 70% of it.
export const TILE = tileSvg(0.7, 0.16);
// Full bleed for iOS, which rounds the corners itself.
export const FULL = tileSvg(0.7, 0);
// Maskable: the turned square's corners sit 30% from the center, inside the 40% safe circle.
export const MASKABLE = tileSvg(0.6, 0);

// ICO with PNG payloads (Windows Vista and later, every current browser).
export const encodeIco = (images: { size: number; png: Buffer }[]) => {
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach(({ size, png }, i) => {
    const entry = 6 + 16 * i;
    header.writeUInt8(size >= 256 ? 0 : size, entry);
    header.writeUInt8(size >= 256 ? 0 : size, entry + 1);
    header.writeUInt16LE(1, entry + 4);
    header.writeUInt16LE(32, entry + 6);
    header.writeUInt32LE(png.length, entry + 8);
    header.writeUInt32LE(offset, entry + 12);
    offset += png.length;
  });
  return Buffer.concat([header, ...images.map((i) => i.png)]);
};

const png = (svg: string, size: number) =>
  sharp(Buffer.from(svg), { density: (72 * size) / SIDE })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toBuffer();

const write = (path: string, data: string | Buffer) => {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data);
  console.log(`Wrote ${path}`);
};

const main = async () => {
  write("src/app/icon.svg", TILE);
  const ico = await Promise.all([16, 32, 48].map(async (size) => ({ size, png: await png(TILE, size) })));
  write("src/app/favicon.ico", encodeIco(ico));
  write("src/app/apple-icon.png", await png(FULL, 180));
  write("public/icons/icon-192.png", await png(TILE, 192));
  write("public/icons/icon-512.png", await png(TILE, 512));
  write("public/icons/maskable-512.png", await png(MASKABLE, 512));
};

if (process.argv[1]?.endsWith("generate-icons.ts")) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
