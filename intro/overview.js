/* Renders the Arena token language from its own source.
 *
 * Names and $descriptions come from contracts/design/*.json; VALUES come from
 * getComputedStyle on the live document, so the page exercises the whole chain
 * (JSON -> build -> CSS -> browser) instead of echoing the JSON back. A token
 * that resolves empty means the committed CSS is stale, and it is flagged
 * rather than displayed as if it were in effect.
 *
 * Served over HTTP only — it fetches its source, which file:// forbids.
 * Run: bun run demos
 */
import { flattenTokens, previewFor } from '../scripts/lib/core/token-preview.ts';
import { parseDecls } from '../scripts/lib/arena/css-decls.ts';

const root = document.documentElement;
const host = document.getElementById('sections');

/** Reads a custom property as the browser currently resolves it. */
const value = (name) => getComputedStyle(root).getPropertyValue(`--${name}`).trim();

const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

async function loadTokens(file) {
  const res = await fetch(`../contracts/design/${file}`);
  if (!res.ok) throw new Error(`cannot load contracts/design/${file}: ${res.status}`);
  return flattenTokens(await res.json());
}

/* One renderer per preview shape. Each returns the element that sits above the
 * name/value/description block, or null when the shape needs no visual. */
const PREVIEW = {
  swatch(token) {
    const node = el('div', 'swatch');
    node.style.background = `var(--${token.name})`;
    const pair = `${token.name}-content`;
    if (value(pair)) {
      node.style.color = `var(--${pair})`;
      node.textContent = 'Aa';
    }
    return node;
  },
  family(token) {
    const node = el('div', null, 'Software worthy of being exalted');
    node.style.fontFamily = `var(--${token.name})`;
    node.style.fontSize = 'var(--fs-h4)';
    node.style.marginBottom = 'var(--sp-3)';
    return node;
  },
  weight(token) {
    const node = el('div', null, 'Arena');
    node.style.fontWeight = `var(--${token.name})`;
    node.style.fontFamily = 'var(--font-display)';
    node.style.fontSize = 'var(--fs-h3)';
    node.style.marginBottom = 'var(--sp-3)';
    return node;
  },
  size(token) {
    const node = el('div', null, 'Arena');
    node.style.fontSize = `var(--${token.name})`;
    node.style.fontFamily = 'var(--font-display)';
    node.style.lineHeight = 'var(--lh-tight)';
    node.style.marginBottom = 'var(--sp-3)';
    node.style.overflow = 'hidden';
    return node;
  },
  leading(token) {
    const node = el('p', null, 'Depth comes from the surface scale, the hairline border and the warm shadow, never from a gradient.');
    node.style.lineHeight = `var(--${token.name})`;
    node.style.fontSize = 'var(--fs-sm)';
    node.style.margin = '0 0 var(--sp-3)';
    return node;
  },
  tracking(token) {
    const node = el('div', null, 'ARENA TRACKING');
    node.style.letterSpacing = `var(--${token.name})`;
    node.style.fontFamily = 'var(--font-mono)';
    node.style.fontSize = 'var(--fs-sm)';
    node.style.marginBottom = 'var(--sp-3)';
    return node;
  },
  bar(token) {
    const rail = el('div');
    rail.style.marginBottom = 'var(--sp-3)';
    const fill = el('div');
    fill.style.height = 'var(--sp-3)';
    fill.style.width = `min(100%, var(--${token.name}))`;
    fill.style.background = 'var(--crimson)';
    fill.style.borderRadius = 'var(--r-xs)';
    rail.append(fill);
    return rail;
  },
  control(token) {
    const node = el('div', null, 'Control');
    node.style.height = `var(--${token.name})`;
    node.style.display = 'flex';
    node.style.alignItems = 'center';
    node.style.padding = '0 var(--sp-3)';
    node.style.background = 'var(--bg-raised)';
    node.style.border = 'var(--bw) solid var(--border-strong)';
    node.style.borderRadius = 'var(--r-sm)';
    node.style.fontFamily = 'var(--font-mono)';
    node.style.fontSize = 'var(--fs-xs)';
    node.style.marginBottom = 'var(--sp-3)';
    return node;
  },
  breakpoint(token) {
    const rail = el('div');
    rail.style.position = 'relative';
    rail.style.height = 'var(--sp-2)';
    rail.style.background = 'var(--bg-raised)';
    rail.style.borderRadius = 'var(--r-xs)';
    rail.style.marginBottom = 'var(--sp-3)';
    const mark = el('div');
    mark.style.position = 'absolute';
    mark.style.insetBlock = '0';
    mark.style.left = '0';
    mark.style.width = `min(100%, calc(var(--${token.name}) / 1024 * 100%))`;
    mark.style.background = 'var(--gold)';
    mark.style.borderRadius = 'var(--r-xs)';
    rail.append(mark);
    return rail;
  },
  radius(token) {
    const node = el('div');
    node.style.height = '64px';
    node.style.background = 'var(--bg-raised)';
    node.style.border = 'var(--bw) solid var(--border-strong)';
    node.style.borderRadius = `var(--${token.name})`;
    node.style.marginBottom = 'var(--sp-3)';
    return node;
  },
  rule(token) {
    const node = el('div');
    node.style.height = `var(--${token.name})`;
    node.style.background = 'var(--border-strong)';
    node.style.margin = 'var(--sp-5) 0';
    return node;
  },
  elevation(token) {
    const node = el('div');
    node.style.height = '64px';
    node.style.background = 'var(--surface-card)';
    node.style.borderRadius = 'var(--r-md)';
    node.style.boxShadow = `var(--${token.name})`;
    node.style.margin = '0 var(--sp-2) var(--sp-5)';
    return node;
  },
  duration(token) {
    const track = el('div');
    track.style.height = 'var(--sp-3)';
    track.style.background = 'var(--bg-raised)';
    track.style.borderRadius = 'var(--r-xs)';
    track.style.overflow = 'hidden';
    track.style.marginBottom = 'var(--sp-3)';
    const fill = el('div');
    fill.style.height = '100%';
    fill.style.width = '100%';
    fill.style.background = 'var(--crimson)';
    fill.style.transformOrigin = 'left';
    fill.style.animation = `arena-sweep var(--${token.name}) var(--ease-out) infinite`;
    track.append(fill);
    return track;
  },
  easing(token) {
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '64');
    svg.style.marginBottom = 'var(--sp-3)';
    const nums = value(token.name).match(/-?[\d.]+/g);
    const path = document.createElementNS(NS, 'path');
    if (nums && nums.length === 4) {
      const [x1, y1, x2, y2] = nums.map(Number);
      path.setAttribute('d', `M0,100 C${x1 * 100},${100 - y1 * 100} ${x2 * 100},${100 - y2 * 100} 100,0`);
    }
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'var(--gold)');
    path.setAttribute('stroke-width', '3');
    svg.append(path);
    return svg;
  },
  value: () => null,
};

function renderToken(token) {
  const resolved = value(token.name);
  const item = el('div', resolved ? 'item' : 'item item-missing');
  const preview = (PREVIEW[previewFor(token.group, token.$type)] ?? PREVIEW.value)(token);
  if (preview) item.append(preview);
  item.append(el('div', 'item-name', `--${token.name}`));
  item.append(el('div', 'item-val', resolved || 'does not resolve — rebuild with bun run generate:tokens'));
  if (token.$description) item.append(el('div', 'item-desc', token.$description));
  return item;
}

/** @param {{eyebrow: string, title: string, note?: string, tokens: Array}} config */
export function renderSection({ eyebrow, title, note, tokens }) {
  const sec = el('section', 'sec');
  sec.append(el('div', 'eyebrow', eyebrow), el('div', 'h2', title));
  if (note) sec.append(el('p', 'note', note));
  const grid = el('div', 'grid');
  for (const token of tokens) grid.append(renderToken(token));
  sec.append(grid);
  const missing = tokens.filter((t) => !value(t.name)).length;
  const tally = el('div', missing ? 'tally tally-bad' : 'tally',
    missing ? `${tokens.length} tokens, ${missing} not resolving` : `${tokens.length} tokens, all resolving`);
  sec.append(tally);
  return sec;
}

/* Re-rendering (rather than patching) on a scope change is what keeps the page
 * honest: every value is read again from the new scope. */
const sections = [];
function paint() {
  host.replaceChildren(...sections.map((make) => make()));
}

async function main() {
  const palette = await loadTokens('palette.dark.json');
  const skin = palette.filter((t) => !t.name.startsWith('color-cat-'));
  const ramp = palette.filter((t) => t.name.startsWith('color-cat-'));

  sections.push(() => renderSection({
    eyebrow: 'Color',
    title: 'Skin',
    note: 'Each colour is defined beside its -content counterpart, the legible colour on top. '
      + 'Where a pair exists the swatch is labelled in its own content colour, which is the contract a skin defines. '
      + 'Values shown are the active theme.',
    tokens: skin,
  }));

  sections.push(() => {
    const sec = renderSection({
      eyebrow: 'Color',
      title: 'Categorical ramp',
      note: 'Identity only, never meaning. Slot order is fixed: slot N is always slot N, and a ninth series '
        + 'folds to Other rather than generating a hue.',
      tokens: ramp,
    });
    const strip = el('div', 'ramp');
    for (const token of ramp) {
      const slot = el('div', 'ramp-slot');
      slot.style.background = `var(--${token.name})`;
      strip.append(slot);
    }
    sec.insertBefore(strip, sec.querySelector('.grid'));
    return sec;
  });

  const type = await loadTokens('typography.json');
  sections.push(() => renderSection({
    eyebrow: 'Typography',
    title: 'Families, weights and scale',
    note: 'Archivo carries display, Familjen Grotesk carries body, Spline Sans Mono carries data and labels. '
      + 'Tracking is a unitless number with an em render hint, because em is not a DTCG dimension unit.',
    tokens: type,
  }));

  const spacing = await loadTokens('spacing.json');
  sections.push(() => renderSection({
    eyebrow: 'Spacing',
    title: 'ArenaGrid, layout and breakpoints',
    note: 'A 4px base grid. Breakpoints are shared values read by JS, never media queries: components style '
      + 'themselves with inline style objects, which cannot hold one.',
    tokens: spacing.filter((t) => t.group !== 'dz'),
  }));

  const compactTokens = await loadTokens('density.compact.json');
  const base = spacing.filter((t) => t.group === 'dz').map((t) => t.name).sort().join();
  if (compactTokens.map((t) => t.name).sort().join() !== base)
    console.warn('overview: density.compact.json and spacing.json disagree on the dz names');

  sections.push(() => renderSection({
    eyebrow: 'Density',
    title: 'Comfortable and compact',
    note: 'Comfortable by default. The compact scope re-densifies rows and controls through one class, '
      + '.arena-compact — use the control above to switch, and these values change in place.',
    tokens: spacing.filter((t) => t.group === 'dz'),
  }));

  const effects = await loadTokens('effects.json');
  sections.push(() => renderSection({
    eyebrow: 'Effects',
    title: 'Radius, elevation, focus and motion',
    note: 'Depth is the surface scale, the hairline border and the warm shadow — never a gradient, and never '
      + 'a tinted glow. Easing curves are drawn from the value the browser resolved.',
    tokens: effects,
  }));

  /* The 40 aliases have no JSON source — they are hand-authored CSS. Their names
   * are read with the same parser the drift gate uses, so there is one
   * implementation rather than a list duplicated here. */
  const colorsCss = await (await fetch('../contracts/design/colors.css')).text();
  const aliasNames = new Set();
  for (const [, decls] of parseDecls(colorsCss)) for (const name of decls.keys()) aliasNames.add(name);
  const aliases = [...aliasNames].map((name) => ({
    name,
    group: 'alias',
    path: [name],
    $type: /picker-invert/.test(name) ? 'number' : 'color',
    $description: undefined,
  }));

  sections.push(() => renderSection({
    eyebrow: 'Composition layer',
    title: 'Aliases and derivations',
    note: 'Hand-authored in contracts/design/colors.css, not generated: DTCG owns values, this layer owns how values '
      + 'are combined at runtime. It defines no skin value of its own — only references and color-mix '
      + 'compositions, which is why every one of these re-derives when the palette is swapped.',
    tokens: aliases,
  }));

  paint();

  document.querySelector('.themebtn').addEventListener('click', paint);
  /* density.js owns the control; this page only has to re-read the values it
   * moved. Listening to its event rather than to the button is what keeps the
   * repaint after the flip: a module registers before that classic script does,
   * so a click listener here would read the state it is about to be told about. */
  document.addEventListener('arena:density', paint);
}

main().catch((err) => {
  host.append(el('p', 'note', `Overview failed to load: ${err.message}`));
  throw err;
});
