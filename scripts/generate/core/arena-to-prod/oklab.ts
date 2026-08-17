/* The colour arithmetic both readers of a palette need, in the tree the packages ship,
 * because a package carries no scripts/ and the gate that holds Arena's own skin has to
 * compute the same number as the command that holds a consumer's. It lives here rather
 * than in validate-palette.mjs, which is vendored verbatim from the dataviz skill and is
 * re-vendored rather than patched. errorFill answers the one derivation a palette may
 * leave to Arena: --color-error-fill, the only filled danger surface, absent from a
 * config that pins nothing. FILL_FALLBACK_KEEP is how much of the colour it keeps. */

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

export const darkenOklab = (hex: string, keep: number) => {
  const [l, a, b] = toOklab(hex);
  return oklabToHex([l * keep, a * keep, b * keep]);
};

export const FILL_FALLBACK_KEEP = 0.85;

export const errorFill = (error: string) => darkenOklab(error, FILL_FALLBACK_KEEP);
