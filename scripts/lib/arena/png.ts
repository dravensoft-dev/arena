/* Enough of PNG to say WHERE two screenshots differ, and no more. check:pixel-parity answers its
 * question by comparing bytes, which needs nothing from here: two identical renders through one
 * encoder produce one file. This exists for the other answer, because a gate that can only say
 * "they differ" sends a reader to open two pages and hunt, which is the manual comparison it
 * replaced. No dependency is taken for it: a decoder for what Chromium emits over CDP is an
 * inflate the runtime ships plus the filters the format defines, against a package in a tree
 * with no image dependency. What is not supported throws rather than guessing, since an
 * interlaced, 16-bit or paletted image reaching here means the capture options moved, and one
 * quietly mis-read would report every pixel as different and blame the component. Sizes are
 * compared over the overlap so a taller page does not bury the row that actually moved. */

import { inflateSync } from 'node:zlib';

export const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export const CHANNELS: Record<number, number> = { 0: 1, 2: 3, 4: 2, 6: 4 };

export type Raster = { width: number; height: number; channels: number; data: Buffer };

export type Chunk = { type: string; body: Buffer };

export function chunks(png: Buffer): Chunk[] {
  if (!png.subarray(0, SIGNATURE.length).equals(SIGNATURE)) {
    throw new Error('png: the bytes do not start with the PNG signature, so this is not a PNG');
  }
  const out: Chunk[] = [];
  let at = SIGNATURE.length;
  while (at + 8 <= png.length) {
    const length = png.readUInt32BE(at);
    const type = png.toString('ascii', at + 4, at + 8);
    out.push({ type, body: png.subarray(at + 8, at + 8 + length) });
    at += 12 + length;
    if (type === 'IEND') break;
  }
  return out;
}

export function header(png: Buffer) {
  const ihdr = chunks(png).find((chunk) => chunk.type === 'IHDR');
  if (!ihdr) throw new Error('png: no IHDR chunk, so the image declares no size or format');
  return {
    width: ihdr.body.readUInt32BE(0),
    height: ihdr.body.readUInt32BE(4),
    bitDepth: ihdr.body.readUInt8(8),
    colorType: ihdr.body.readUInt8(9),
    interlace: ihdr.body.readUInt8(12),
  };
}

export function paeth(a: number, b: number, c: number) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

export function unfilter(raw: Buffer, width: number, height: number, channels: number) {
  const stride = width * channels;
  const out = Buffer.alloc(stride * height);
  let at = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[at];
    at += 1;
    const line = out.subarray(y * stride, (y + 1) * stride);
    const above = y === 0 ? null : out.subarray((y - 1) * stride, y * stride);
    for (let x = 0; x < stride; x += 1) {
      const value = raw[at + x] ?? 0;
      const left = x >= channels ? (line[x - channels] ?? 0) : 0;
      const up = above ? (above[x] ?? 0) : 0;
      const upLeft = above && x >= channels ? (above[x - channels] ?? 0) : 0;
      let restored = value;
      if (filter === 1) restored = value + left;
      else if (filter === 2) restored = value + up;
      else if (filter === 3) restored = value + ((left + up) >> 1);
      else if (filter === 4) restored = value + paeth(left, up, upLeft);
      else if (filter !== 0) {
        throw new Error(`png: scanline ${y} declares filter ${filter}, and the format defines none above 4`);
      }
      line[x] = restored & 0xff;
    }
    at += stride;
  }
  return out;
}

export function decode(png: Buffer): Raster {
  const { width, height, bitDepth, colorType, interlace } = header(png);
  if (bitDepth !== 8) {
    throw new Error(`png: bit depth ${bitDepth}, and only 8 is read here; the capture options moved`);
  }
  if (interlace !== 0) {
    throw new Error('png: the image is interlaced, and only a progressive one is read here');
  }
  const channels = CHANNELS[colorType];
  if (!channels || colorType === 3) {
    throw new Error(`png: colour type ${colorType} is not read here; a paletted image needs its PLTE resolved`);
  }
  const idat = chunks(png).filter((chunk) => chunk.type === 'IDAT').map((chunk) => chunk.body);
  if (idat.length === 0) throw new Error('png: no IDAT chunk, so the image carries no pixels');
  const data = unfilter(inflateSync(Buffer.concat(idat)), width, height, channels);
  return { width, height, channels, data };
}

export type Difference = {
  pixels: number;
  box: { left: number; top: number; right: number; bottom: number };
  maxDelta: number;
  channel: number;
};

export const CHANNEL_NAMES = ['red', 'green', 'blue', 'alpha'];

export function difference(a: Raster, b: Raster): Difference | null {
  const width = Math.min(a.width, b.width);
  const height = Math.min(a.height, b.height);
  let pixels = 0;
  let maxDelta = 0;
  let channel = 0;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const ai = (y * a.width + x) * a.channels;
      const bi = (y * b.width + x) * b.channels;
      let moved = false;
      for (let c = 0; c < Math.min(a.channels, b.channels); c += 1) {
        const delta = Math.abs((a.data[ai + c] ?? 0) - (b.data[bi + c] ?? 0));
        if (delta === 0) continue;
        moved = true;
        if (delta > maxDelta) { maxDelta = delta; channel = c; }
      }
      if (!moved) continue;
      pixels += 1;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (pixels === 0) return null;
  return { pixels, box: { left, top, right, bottom }, maxDelta, channel };
}
