import { readFileSync } from "node:fs";

// Reads the pixel size from a JPEG start-of-frame marker.
export const jpegSize = (file: string) => {
  const buf = readFileSync(file);
  let i = 2;
  while (i < buf.length) {
    if (buf[i] !== 0xff) throw new Error(`bad JPEG marker in ${file}`);
    const marker = buf[i + 1];
    if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
      return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    }
    i += 2 + buf.readUInt16BE(i + 2);
  }
  throw new Error(`no frame header in ${file}`);
};
