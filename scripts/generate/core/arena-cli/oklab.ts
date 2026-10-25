/* The colour arithmetic both readers of a palette need, in the tree the packages ship, because a package
 * carries no scripts/ and the gate holding Arena's skin must compute the command's number. It is not in
 * validate-palette.mjs, which is vendored and re-vendored rather than patched. errorFill derives
 * --color-error-fill for a config that pins none, moving error AWAY from error-content rather than toward
 * black, and FILL_FALLBACK_KEEP is how much of the colour it keeps. heatLadder derives the five heat steps
 * of a palette that pins none, step 1 at HEAT_FLOOR and equal lightness gaps up to HEAT_REACH of the ink,
 * because fixed stops crowd a light slot. A cramped ink still comes out ordered, and ladderGaps is the one
 * rule arena check and check:ramp both read: one direction, and HEAT_MIN_DL between neighbours. */

import { contrast } from './validate-palette.mjs';
import { ARENA_HEAT_STEPS } from './palette-keys.ts';

export type Triple = [number, number, number];

export const hex2rgb = (h: string): Triple =>
  [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export const rgb2hex = (rgb: Triple) =>
  '#' + rgb.map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');

export const composite = (fg: string, bg: string, percent: number) => {
  const [fr, fgreen, fb] = hex2rgb(fg);
  const [br, bgreen, bb] = hex2rgb(bg);
  const a = percent / 100;
  const over = (f: number, b: number) => f * a + b * (1 - a);
  return rgb2hex([over(fr, br), over(fgreen, bgreen), over(fb, bb)]);
};

const s2lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lin2s = (c: number) => {
  const v = Math.max(0, Math.min(1, c));
  return v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
};

export function toOklab(hex: string): Triple {
  const [red, green, blue] = hex2rgb(hex);
  const [r, g, b] = [s2lin(red / 255), s2lin(green / 255), s2lin(blue / 255)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}

export function oklabToHex([L, a, b]: Triple) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const linear: Triple = [
    +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s,
  ];
  return rgb2hex([lin2s(linear[0]) * 255, lin2s(linear[1]) * 255, lin2s(linear[2]) * 255]);
}

export const towardOklab = (hex: string, keep: number, target: 0 | 1) => {
  const [l, a, b] = toOklab(hex);
  return oklabToHex([l * keep + (1 - keep) * target, a * keep, b * keep]);
};

export const darkenOklab = (hex: string, keep: number) => towardOklab(hex, keep, 0);

export const lightenOklab = (hex: string, keep: number) => towardOklab(hex, keep, 1);

export const FILL_FALLBACK_KEEP = 0.85;

export const errorFill = (error: string, content: string) =>
  (toOklab(content)[0] >= toOklab(error)[0]
    ? darkenOklab(error, FILL_FALLBACK_KEEP)
    : lightenOklab(error, FILL_FALLBACK_KEEP));

export const HEAT_FLOOR = 2.1;

export const HEAT_REACH = 0.85;

const mixOklab = (hex: string, keep: number, over: string) => {
  const one = toOklab(hex);
  const two = toOklab(over);
  return oklabToHex([0, 1, 2].map((i) => one[i]! * keep + two[i]! * (1 - keep)) as Triple);
};

const bisect = (from: number, reached: (t: number) => boolean) => {
  let [lo, hi] = [from, 2];
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (reached(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
};

export function heatLadder(slot: string, surface: string, ink: string, _polarity: string): string[] {
  const at = (t: number) => (t <= 1 ? mixOklab(slot, t, surface) : mixOklab(slot, 2 - t, ink));
  const lightness = (t: number) => toOklab(at(t))[0];
  const toward = Math.sign(toOklab(ink)[0] - toOklab(surface)[0]);
  const first = bisect(0, (t) => contrast(at(t), surface) >= HEAT_FLOOR);
  const low = lightness(first);
  const high = low + (toOklab(ink)[0] - low) * HEAT_REACH;
  const stops = [first];
  for (let step = 1; step < ARENA_HEAT_STEPS; step++) {
    const target = low + ((high - low) * step) / (ARENA_HEAT_STEPS - 1);
    stops.push(bisect(stops[step - 1]!, (t) => toward * (lightness(t) - target) >= 0));
  }
  return stops.map(at);
}

export const HEAT_MIN_DL = 0.06;

export function ladderGaps(lightness: readonly number[]) {
  const gaps = lightness.slice(1).map((l, i) => l - lightness[i]!);
  const rising = gaps.every((g) => g > 0);
  const falling = gaps.every((g) => g < 0);
  const least = Math.min(...gaps.map(Math.abs));
  return { gaps, ordered: rising || falling, least, ok: (rising || falling) && least >= HEAT_MIN_DL };
}

export function heatCramped(steps: readonly string[]) {
  const lightness = steps.map((hex) => toOklab(hex)[0]);
  const { ordered, gaps } = ladderGaps(lightness);
  const cramped: { from: number; to: number; gap: number }[] = [];
  gaps.forEach((gap, i) => {
    if (Math.abs(gap) < HEAT_MIN_DL) cramped.push({ from: i + 1, to: i + 2, gap: Math.abs(gap) });
  });
  return { ordered, cramped };
}
