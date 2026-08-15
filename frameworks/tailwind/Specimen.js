import { classesFor, arenaClassesFor } from './ManifestClasses.js';

for (const style of ['bold', 'fill']) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `../../../node_modules/@phosphor-icons/web/src/${style}/style.css`;
  document.head.appendChild(link);
}

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

export { classesFor, arenaClassesFor };
