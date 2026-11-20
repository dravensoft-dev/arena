/* One spelling of a DTCG value as CSS, in the command's own tree because both readers need it:
 * the generator, which emits the sheets this repository ships, and the shipped CLI, which reads
 * the plugin.tokens.json a consumer's own style plugin holds. A package carries no scripts/, so a
 * module up there is a specifier that resolves here and to nothing beside a consumer's
 * node_modules. `$value` is `any` because `$type` decides its shape, and this file owns that
 * knowledge, so an unrecognised shape is thrown rather than spelled: the caller knows whether to
 * pass an author's literal through or to name the file.
 * BROWSER_DEFAULT_PX, below, is 16 because CSS Fonts 4 `medium` is 16px and the initial value of
 * `font-size`: a scales px length is divided by it, so the browser default draws the authored pixel
 * and the user's text setting moves it. */

export const BROWSER_DEFAULT_PX = 16;

import { ARENA_EXT, NO_PAINT } from './style-plugin-rules.ts';
import { GENERIC_FAMILIES } from './palette-keys.ts';

export type SerializableToken = {
  $value: any;
  $type?: string;
  $extensions?: Record<string, any>;
};

const trim = (n: number | string) => String(n).replace(/^(-?)0\./, '$1.');

const dim = (d: { value: number; unit: string }, what: string) => {
  if (typeof d?.value !== 'number' || typeof d?.unit !== 'string') {
    throw new Error(`serialize: ${what}: ${JSON.stringify(d)} is not a {value, unit} length. `
      + 'Reading the two off anything else spells undefinedundefined, and a custom property with '
      + 'an invalid value is dropped at computed-value time along with the declaration reading it.');
  }
  return `${d.value}${d.unit}`;
};

export type Emission = { axis?: string; relative?: 'rem' | 'em' };

const PX_LENGTH = /^-?\d*\.?\d+px$/;

const relativeOf = (px: number, relative: 'rem' | 'em') =>
  `${Number((px / BROWSER_DEFAULT_PX).toFixed(6))}${relative}`;

export function emittedLength(d: { value: number; unit: string }, emission: Emission = {}) {
  const written = dim(d, 'dimension');
  if (emission.axis !== 'scales' || d.unit !== 'px') return written;
  return relativeOf(d.value, emission.relative ?? 'rem');
}

export function scaledLiteral(css: string, emission: Emission = {}) {
  if (emission.axis !== 'scales' || !PX_LENGTH.test(css)) return css;
  return relativeOf(Number.parseFloat(css), emission.relative ?? 'rem');
}

const color = (c: { hex?: string; components: number[]; alpha?: number }) => {
  if (c.hex) return c.hex;
  const [r, g, b] = c.components.map((v: number) => Math.round(v * 255));
  const a = c.alpha ?? 1;
  return a === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${trim(a)})`;
};

export function serialize(token: SerializableToken, emission: Emission = {}) {
  const v = token.$value;
  switch (token.$type) {
    case 'dimension':
      return emittedLength(v, emission);
    case 'duration':
      return dim(v, 'duration');
    case 'number': {
      const unit = token.$extensions?.[ARENA_EXT]?.cssUnit;
      return unit ? `${v}${unit}` : String(v);
    }
    case 'fontWeight':
      return String(v);
    case 'keyword':
      return String(v);
    case 'cubicBezier':
      return `cubic-bezier(${v.map(trim).join(',')})`;
    case 'color':
      return v === NO_PAINT ? v : color(v);
    case 'fontFamily':
      return (Array.isArray(v) ? v : [v])
        .map((f) => (GENERIC_FAMILIES.has(f) ? f : `'${f}'`))
        .join(',');
    case 'shadow':
      return `${v.inset ? 'inset ' : ''}${dim(v.offsetX, 'shadow')} ${dim(v.offsetY, 'shadow')} `
        + `${dim(v.blur, 'shadow')} ${dim(v.spread, 'shadow')} ${color(v.color)}`;
    default:
      throw new Error(`serialize: unsupported $type: ${token.$type}`);
  }
}
