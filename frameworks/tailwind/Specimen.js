import { classesFor, arenaClassesFor, arenaSlotDataFor } from './ManifestClasses.js';

export function el(tag, props = {}, ...children) {
  const node = tag === 'svg' || tag === 'path' || tag === 'circle'
    ? document.createElementNS('http://www.w3.org/2000/svg', tag)
    : document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'text') node.textContent = v;
    else if (k === 'class') node.setAttribute('class', v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else node.setAttribute(k, String(v));
  }
  for (const child of children) node.append(child);
  return node;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const SPRITE = new URL('../../assets/Icons.generated.svg', import.meta.url).href;
const WEIGHTS = { 'ph-thin': 'thin', 'ph-light': 'light', ph: 'regular', 'ph-bold': 'bold', 'ph-duotone': 'duotone', 'ph-fill': 'fill' };
const SIZED = /^(?:[\w-]+:)*(?:size|w|h)-/;

export function glyph(classList, props = {}) {
  const tokens = String(classList).split(/\s+/).filter(Boolean);
  const weight = tokens.map((t) => WEIGHTS[t]).find(Boolean) ?? 'regular';
  const name = tokens.find((t) => t.startsWith('ph-') && !(t in WEIGHTS));
  if (!name) throw new Error(`glyph: no glyph token in "${classList}"`);
  const kept = tokens.filter((t) => !(t in WEIGHTS) && t !== name);
  const { style, ...rest } = props;
  const given = typeof style === 'object' && style
    ? Object.entries(style).map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}:${v}`).join(';')
    : style || '';
  const box = kept.some((t) => SIZED.test(t)) ? '' : 'width:1em;height:1em;';
  const svg = el('svg', {
    class: kept.join(' ') || undefined,
    'aria-hidden': 'true',
    focusable: 'false',
    ...rest,
    style: `${box}fill:currentColor${given ? ';' + given : ''}`,
  });
  const use = document.createElementNS(SVG_NS, 'use');
  use.setAttribute('href', `${SPRITE}#ph-${weight}-${name.slice(3)}`);
  svg.append(use);
  return svg;
}

export function section(label, nodes, opts = {}) {
  return {
    label,
    nodes,
    stack: Boolean(opts.stack),
    align: opts.align,
    justify: opts.justify,
    gap: opts.gap,
  };
}

export function mountSpecimen({ sections, mount = document.getElementById('root') }) {
  for (const { label, nodes, stack, align, justify, gap } of sections) {
    mount.append(el('div', { class: 'sub', text: label }));
    const classes = ['row'];
    if (stack) classes.push('stack');
    if (align) classes.push(`align-${align}`);
    if (justify) classes.push(`justify-${justify}`);
    if (gap) classes.push(`gap-${gap}`);
    const row = el('div', { class: classes.join(' ') });
    for (const node of nodes) row.append(node);
    mount.append(row);
  }
}

export { classesFor, arenaClassesFor, arenaSlotDataFor };
