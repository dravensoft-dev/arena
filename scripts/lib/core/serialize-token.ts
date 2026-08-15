import { ARENA_EXT } from './dtcg-shapes.ts';
import type { DtcgToken } from './dtcg-shapes.ts';

const GENERIC_FAMILIES = new Set([
  'serif', 'sans-serif', 'monospace', 'cursive', 'fantasy',
  'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded',
  'math', 'emoji', 'fangsong',
]);

const trim = (n: number | string) => String(n).replace(/^(-?)0\./, '$1.');

const dim = (d: { value: number; unit: string }) => `${d.value}${d.unit}`;

const color = (c: { hex?: string; components: number[]; alpha?: number }) => {
  if (c.hex) return c.hex;
  const [r, g, b] = c.components.map((v: number) => Math.round(v * 255));
  const a = c.alpha ?? 1;
  return a === 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${trim(a)})`;
};

export function serialize(token: DtcgToken) {
  const v = token.$value;
  switch (token.$type) {
    case 'dimension':
      return dim(v);
    case 'duration':
      return `${v.value}${v.unit}`;
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
      return color(v);
    case 'fontFamily':
      return (Array.isArray(v) ? v : [v])
        .map((f) => (GENERIC_FAMILIES.has(f) ? f : `'${f}'`))
        .join(',');
    case 'shadow':
      return `${v.inset ? 'inset ' : ''}${dim(v.offsetX)} ${dim(v.offsetY)} ${dim(v.blur)} ${dim(v.spread)} ${color(v.color)}`;
    default:
      throw new Error(`serialize: unsupported $type: ${token.$type}`);
  }
}
