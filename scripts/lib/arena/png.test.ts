/* Drives the decoder with images built here rather than with a capture, so a filter type the
 * encoder happens not to choose is still covered: Chromium picks its own per scanline, and a
 * decoder that only ever met filter 0 would mis-read the first page that provoked filter 4 and
 * report every pixel as moved. The encoder below is the test's, not the tree's, and it APPLIES
 * the filter rather than merely declaring it: writing plain bytes under a non-zero filter byte
 * would make a correct decoder un-filter something nobody filtered, and the suite would then be
 * asserting its own arithmetic. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { SIGNATURE, chunks, header, paeth, unfilter, decode, difference } from './png.ts';

function crc32(buf: Buffer) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k += 1) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type: string, body: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(body.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([length, typed, crc]);
}

function png(width: number, height: number, pixels: number[][], filter = 0) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  const flat = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const rgba = pixels[y * width + x] ?? [0, 0, 0, 255];
      for (let c = 0; c < 4; c += 1) flat[y * stride + x * 4 + c] = rgba[c] ?? 0;
    }
  }
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = filter;
    for (let x = 0; x < stride; x += 1) {
      const value = flat[y * stride + x] ?? 0;
      const left = x >= 4 ? (flat[y * stride + x - 4] ?? 0) : 0;
      const up = y > 0 ? (flat[(y - 1) * stride + x] ?? 0) : 0;
      const upLeft = y > 0 && x >= 4 ? (flat[(y - 1) * stride + x - 4] ?? 0) : 0;
      let encoded = value;
      if (filter === 1) encoded = value - left;
      else if (filter === 2) encoded = value - up;
      else if (filter === 3) encoded = value - ((left + up) >> 1);
      else if (filter === 4) encoded = value - paeth(left, up, upLeft);
      raw[y * (stride + 1) + 1 + x] = encoded & 0xff;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([SIGNATURE, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const BLACK = [0, 0, 0, 255];
const WHITE = [255, 255, 255, 255];

test('a buffer that is not a PNG is refused rather than read as one', () => {
  assert.throws(() => chunks(Buffer.from('not a png at all')), /PNG signature/);
});

test('the header reports the size and format the image declares', () => {
  const head = header(png(3, 2, [BLACK, WHITE, BLACK, WHITE, BLACK, WHITE]));
  assert.deepEqual(head, { width: 3, height: 2, bitDepth: 8, colorType: 6, interlace: 0 });
});

test('an unfiltered image decodes to the pixels it was written from', () => {
  const image = decode(png(2, 1, [[10, 20, 30, 255], [40, 50, 60, 255]]));
  assert.equal(image.width, 2);
  assert.equal(image.channels, 4);
  assert.deepEqual([...image.data.subarray(0, 8)], [10, 20, 30, 255, 40, 50, 60, 255]);
});

test('every filter the format defines is reversed, which no single capture would exercise', () => {
  const pixels = [[9, 40, 200, 255], [17, 41, 199, 255], [200, 3, 7, 255], [201, 9, 6, 255]];
  for (const filter of [0, 1, 2, 3, 4]) {
    const image = decode(png(2, 2, pixels, filter));
    assert.deepEqual([...image.data], pixels.flat(), `filter ${filter} did not round-trip`);
  }
});

test('a filter the format does not define fails rather than being read as none', () => {
  assert.throws(() => unfilter(Buffer.from([5, 0, 0, 0, 0]), 1, 1, 4), /filter 5/);
});

test('paeth picks the neighbour the prediction is nearest, which is where an off-by-one hides', () => {
  assert.equal(paeth(10, 20, 30), 10, 'the prediction is nearest the pixel to the left');
  assert.equal(paeth(20, 30, 10), 30, 'the prediction is nearest the pixel above');
  assert.equal(paeth(10, 20, 15), 15, 'the prediction is nearest the pixel above and to the left');
});

test('two identical images report no difference at all', () => {
  const a = decode(png(2, 2, [BLACK, WHITE, WHITE, BLACK]));
  const b = decode(png(2, 2, [BLACK, WHITE, WHITE, BLACK]));
  assert.equal(difference(a, b), null);
});

test('a difference carries the count, the box around it and the channel that moved furthest', () => {
  const a = decode(png(3, 3, Array(9).fill(BLACK)));
  const moved = Array(9).fill(BLACK);
  moved[4] = [0, 0, 90, 255];
  const b = decode(png(3, 3, moved));
  const diff = difference(a, b);
  assert.ok(diff);
  assert.equal(diff.pixels, 1);
  assert.deepEqual(diff.box, { left: 1, top: 1, right: 1, bottom: 1 });
  assert.equal(diff.maxDelta, 90);
  assert.equal(diff.channel, 2);
});

test('images of different heights are compared over the overlap, so the tail does not bury the move', () => {
  const a = decode(png(1, 3, [BLACK, WHITE, BLACK]));
  const b = decode(png(1, 2, [BLACK, BLACK]));
  const diff = difference(a, b);
  assert.ok(diff);
  assert.equal(diff.pixels, 1);
  assert.deepEqual(diff.box, { left: 0, top: 1, right: 0, bottom: 1 });
});
