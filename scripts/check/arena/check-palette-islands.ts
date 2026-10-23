/* Holds the one claim a palette island exists to make: inside it, nothing is painted from the
 * palette outside. The `palettes` sink draws an island of each polarity; this loads it in both
 * layers and both themes, hovers and focuses each tooltip trigger so the bubble is open (the
 * Angular one leaves the island for the overlay container), resolves both palettes from every
 * custom property a palette rule declares on a probe wearing each class, once flat and once inside
 * the opposite class (a name whose value moves between the two is reported), and reads the painted
 * colours of every element in the island and its bubble. A colour only the opposite palette holds
 * is an outsider; one both hold is ignored. Colours compare as the 8-bit sRGB a canvas draws, and
 * alpha 0 paints nothing, so it is dropped from both sides. */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { withTimeout } from '../../utils/with-timeout.ts';
import { deadline, type Deadline } from '../../lib/arena/deadline.ts';
import { POLL_MS } from '../../lib/arena/wait-for.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { startStaticServer } from '../../lib/arena/static-server.ts';
import { browserOrExit, launchChromium } from '../../lib/arena/chromium.ts';
import { connect, evaluate, PageThrew } from '../../lib/arena/cdp.ts';
import type { Cdp } from '../../lib/arena/cdp.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { cannotRun } from '../../lib/arena/arena-scripts-vars.ts';
import { COLLECT, REPORT, paintedProblem, silenceOf, threwProblem, type Painted, type Silence } from '../../lib/arena/page-errors.ts';
import { loadInFreshTab, networkChangedProblem, type Lost } from '../../lib/arena/page-load.ts';
import { SINK_LAYERS } from '../../generate/arena/generate-kitchen-sink.ts';
import { THEMES, VIEWPORT, NAVIGATE, PAINTED, readyExpression, loaded, pagePath } from './check-pixel-parity.ts';

export const node = {
  name: 'check:palette-islands',
  reads: [
    'frameworks/react/kitchen-sink/palettes/**', 'frameworks/angular/kitchen-sink/palettes/**',
    'frameworks/react/components/**/*.generated.js',
    'frameworks/react/*.generated.js',
    'frameworks/tailwind/consume/**', 'frameworks/react/vendor/**',
    'frameworks/angular/build/demo/**', 'contracts/design-generated/**',
    'contracts/design/*.css', 'assets/fonts/**', 'assets/Icons.generated.svg', 'assets/rotor-crimson.svg',
    'intro/kitchen-sink.css', 'intro/styles.css', 'intro/toggle.css', 'intro/theme.js',
    'plugin-style-store/**/plugin.css',
  ],
  writes: [],
  feeds: [],
};

export const SINK = 'palettes';

export const OPENED: Deadline = deadline('palette-islands:opened', 10_000,
  'the bubble opens after the open delay and, in the Angular layer, after the overlay has attached '
  + 'its pane, which on a runner with no GPU takes a few frames past the delay');

export const CLOSED: Deadline = deadline('palette-islands:closed', 10_000,
  'the bubble closes after the close delay once the pointer and focus have left, and the next '
  + 'island is read only when no bubble is left over from this one');

export type Colours = Set<string>;

export type Finding = { selector: string; property: string; colour: string };

export type IslandReading = {
  palette: string;
  island: string[];
  outer: string[];
  painted: Finding[];
  bubbles: number;
  elements: number;
  nested: string[];
  waits: Waits;
};

export type Waits = { opened: boolean; closed: boolean };

export type PageReading = { layer: string; theme: string; islands: IslandReading[] };

export function paintedOutsiders(island: Colours, outer: Colours, painted: Colours): string[] {
  return [...painted].filter((colour) => outer.has(colour) && !island.has(colour)).sort();
}

export function outsiderLines(layer: string, theme: string, reading: IslandReading) {
  const island = new Set(reading.island);
  const outer = new Set(reading.outer);
  const lines: string[] = [];
  const seen = new Set<string>();
  for (const one of reading.painted) {
    if (paintedOutsiders(island, outer, new Set([one.colour])).length === 0) continue;
    const line = `${layer} ${SINK}?theme=${theme} ${one.selector} ${one.property} ${one.colour}`;
    if (seen.has(line)) continue;
    seen.add(line);
    lines.push(`${line} (inside a ${reading.palette} island, and this colour is the other palette's)`);
  }
  return lines;
}

export function readIslandProblems(label: string, waits: Waits) {
  const problems: string[] = [];
  if (!waits.opened) {
    problems.push(`${label}: the tooltip bubble did not open within ${OPENED.ms}ms, so the overlay was read without it`);
  }
  if (!waits.closed) {
    problems.push(`${label}: the tooltip bubble did not close within ${CLOSED.ms}ms, so a bubble left over would shift the next island's reading`);
  }
  return problems;
}

export function readingProblems(reading: PageReading) {
  const where = `${reading.layer} ${SINK}?theme=${reading.theme}`;
  const problems: string[] = [];
  if (reading.islands.length === 0) {
    return [`${where}: the page holds no palette island, so there is nothing to read`];
  }
  for (const one of reading.islands) {
    const label = `${where} ${one.palette} island`;
    if (one.island.length === 0 || one.outer.length === 0) {
      problems.push(`${label}: a palette resolved to no colour, so no colour could be told apart`);
    } else {
      const mine = new Set(one.island);
      const theirs = new Set(one.outer);
      if ([...mine].every((c) => theirs.has(c)) || [...theirs].every((c) => mine.has(c))) {
        problems.push(`${label}: one palette holds nothing the other lacks, so an outsider could not be told from the island's own`);
      }
    }
    for (const name of one.nested) {
      problems.push(`${label}: ${name} resolves differently on a probe inside the opposite palette class than on a flat one, `
        + 'so a token derived from the palette was not restated for the nesting and reads as shared');
    }
    problems.push(...readIslandProblems(label, one.waits));
    if (one.bubbles === 0) {
      problems.push(`${label}: no tooltip opened, so the overlay was not read`);
    }
    if (one.elements === 0 || one.painted.length === 0) {
      problems.push(`${label}: no painted colour was read from ${one.elements} element(s)`);
    }
    problems.push(...outsiderLines(reading.layer, reading.theme, one));
  }
  return problems;
}

export type Sweep = () => Promise<{ problems: string[]; pages: number; islands: number; colours?: number; bubbles?: number }>;

export async function main(sweep: Sweep = realSweep, fail: (code: number) => never = (code) => process.exit(code)) {
  const { problems, pages, islands, colours = 0, bubbles = 0 } = await sweep();
  if (problems.length > 0) {
    console.error(`check-palette-islands: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    return fail(1);
  }
  console.log(`check-palette-islands: ${islands} island(s) read across ${pages} page(s), both layers and both themes, `
    + 'each with its tooltip open ('
    + `${bubbles} bubble(s)), ${colours} painted colour(s) read, and none came from the palette outside`);
}

export const NORMALISE = `(() => {
  if (window.__arenaNorm) return;
  const canvas = document.createElement('canvas');
  canvas.width = 1; canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  window.__arenaNorm = (value) => {
    if (!value || /currentcolor|inherit|initial|unset/i.test(value) || !CSS.supports('color', value)) return null;
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = '#000000';
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const d = context.getImageData(0, 0, 1, 1).data;
    if (d[3] === 0) return null;
    return d[3] === 255 ? 'rgb(' + d[0] + ', ' + d[1] + ', ' + d[2] + ')'
      : 'rgba(' + d[0] + ', ' + d[1] + ', ' + d[2] + ', ' + (d[3] / 255).toFixed(2) + ')';
  };
})()`;

export const ISLANDS = `[...document.querySelectorAll('body .arena-light, body .arena-dark')]`;

export const PALETTES = `(() => {
  ${NORMALISE};
  const names = new Set();
  const own = /(^|[\\s,>])(:root|\\.arena-light|\\.arena-dark)(?![\\w-])/;
  const walk = (rules) => {
    for (const rule of rules) {
      if (rule.styleSheet) { try { walk(rule.styleSheet.cssRules); } catch (_) {} }
      if (rule.cssRules) walk(rule.cssRules);
      if (!rule.style || !own.test(rule.selectorText || '')) continue;
      for (let i = 0; i < rule.style.length; i += 1) {
        const name = rule.style[i];
        if (name.startsWith('--')) names.add(name);
      }
    }
  };
  for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch (_) {} }
  const out = { nested: {} };
  const resolve = (host, palette) => {
    const probe = document.createElement('div');
    probe.className = 'arena-' + palette;
    host.append(probe);
    const style = getComputedStyle(probe);
    const values = new Map([...names].map((n) => [n, window.__arenaNorm(style.getPropertyValue(n).trim())]));
    probe.remove();
    return values;
  };
  for (const palette of ['light', 'dark']) {
    const opposite = document.createElement('div');
    opposite.className = 'arena-' + (palette === 'light' ? 'dark' : 'light');
    document.body.append(opposite);
    const flat = resolve(document.body, palette);
    const inside = resolve(opposite, palette);
    opposite.remove();
    out[palette] = [...new Set([...flat.values()].filter(Boolean))];
    out.nested[palette] = [...names].filter((n) => flat.get(n) !== inside.get(n)).sort();
  }
  return out;
})()`;

export const TRIGGER = (index: number) => `(() => {
  const island = ${ISLANDS}[${index}];
  const root = island && island.querySelector('[data-arena-part="tooltip"]');
  const trigger = root && root.firstElementChild;
  if (!trigger) return null;
  trigger.scrollIntoView({ block: 'center' });
  const r = trigger.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
})()`;

export const FOCUS = (index: number) => `(() => {
  const island = ${ISLANDS}[${index}];
  const trigger = island.querySelector('[data-arena-part="tooltip"]').firstElementChild;
  const control = trigger.matches('button, a[href], input, select, textarea, [tabindex]') ? trigger
    : trigger.querySelector('button, a[href], input, select, textarea, [tabindex]');
  if (!control) return false;
  control.focus();
  return trigger.contains(document.activeElement);
})()`;

export const BLUR = '(() => { if (document.activeElement instanceof HTMLElement) document.activeElement.blur(); return true; })()';

export function bubbleExpression(want: boolean, bound: Deadline) {
  return `new Promise((resolve) => {
    const until = Date.now() + ${bound.ms};
    const tick = () => {
      const there = document.querySelector('[role="tooltip"]') !== null;
      if (there === ${want}) {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(true)));
      } else if (Date.now() >= until) resolve(false);
      else setTimeout(tick, ${POLL_MS});
    };
    tick();
  })`;
}

export const COLLECT_PAINT = (index: number) => `(() => {
  ${NORMALISE};
  const norm = window.__arenaNorm;
  const island = ${ISLANDS}[${index}];
  const roots = [island];
  const bubbles = [...document.querySelectorAll('[role="tooltip"]')];
  for (const bubble of bubbles) {
    const pane = bubble.closest('.cdk-overlay-pane') || bubble;
    if (!island.contains(pane) && !roots.includes(pane)) roots.push(pane);
  }
  const elements = [...new Set(roots.flatMap((r) => [r, ...r.querySelectorAll('*')]))];
  const FORM = new Set(['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON']);
  const describe = (el) => {
    const part = el.getAttribute('data-arena-part');
    const outside = !island.contains(el);
    return (outside ? 'overlay ' : '') + el.localName + (part ? '[data-arena-part="' + part + '"]'
      : el.classList.length ? '.' + el.classList[0] : '');
  };
  const shades = /(?:rgba?|color|oklab|oklch|lab|lch|hsla?|hwb)\\([^)]*\\)/g;
  const found = [];
  const seen = new Set();
  const add = (selector, property, value) => {
    const colour = norm(value);
    if (!colour) return;
    const key = selector + '|' + property + '|' + colour;
    if (seen.has(key)) return;
    seen.add(key);
    found.push({ selector, property, colour });
  };
  const addAll = (selector, property, text) => {
    if (!text || text === 'none') return;
    for (const one of text.match(shades) || []) add(selector, property, one);
  };
  const read = (selector, s, own) => {
    if (own) add(selector, 'color', s.color);
    add(selector, 'background-color', s.backgroundColor);
    addAll(selector, 'background-image', s.backgroundImage);
    for (const side of ['top', 'right', 'bottom', 'left']) {
      if (parseFloat(s['border-' + side + '-width']) > 0 && s['border-' + side + '-style'] !== 'none')
        add(selector, 'border-' + side + '-color', s['border-' + side + '-color']);
    }
    if (parseFloat(s.outlineWidth) > 0 && s.outlineStyle !== 'none') add(selector, 'outline-color', s.outlineColor);
    if (s.textDecorationLine !== 'none') add(selector, 'text-decoration-color', s.textDecorationColor);
    addAll(selector, 'box-shadow', s.boxShadow);
  };
  for (const el of elements) {
    if (el.getClientRects().length === 0) continue;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden') continue;
    const selector = describe(el);
    const text = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() !== '');
    read(selector, s, text || FORM.has(el.tagName) || el instanceof SVGElement);
    if (el instanceof SVGElement) { add(selector, 'fill', s.fill); add(selector, 'stroke', s.stroke); }
    if (el.localName === 'input' || el.localName === 'textarea') {
      add(selector, 'caret-color', s.caretColor);
      add(selector + '::placeholder', 'color', getComputedStyle(el, '::placeholder').color);
    }
    for (const pseudo of ['::before', '::after']) {
      const p = getComputedStyle(el, pseudo);
      if (p.content === 'none' || p.content === 'normal') continue;
      read(selector + pseudo, p, p.content !== '""');
    }
  }
  return { painted: found, bubbles: bubbles.length, elements: elements.length };
})()`;

export async function readIsland(cdp: Cdp, sessionId: string, index: number) {
  const ev = (expression: string) => evaluate(cdp, expression, sessionId);
  const at = await ev(TRIGGER(index)) as { x: number; y: number } | null;
  let opened = true;
  if (at) {
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: at.x, y: at.y }, sessionId);
    await ev(FOCUS(index));
    opened = await ev(bubbleExpression(true, OPENED)) as boolean;
  }
  const read = await ev(COLLECT_PAINT(index)) as { painted: Finding[]; bubbles: number; elements: number };
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 }, sessionId);
  await ev(BLUR);
  const closed = await ev(bubbleExpression(false, CLOSED)) as boolean;
  return { ...read, waits: { opened, closed } };
}

async function readIn(cdp: Cdp, sessionId: string, layer: string, theme: string, url: string) {
  await cdp.send('Emulation.setDeviceMetricsOverride', VIEWPORT, sessionId);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
  }, sessionId);
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: COLLECT }, sessionId);
  const settled = loaded(cdp, sessionId);
  await withTimeout(cdp.send('Page.navigate', { url }, sessionId), NAVIGATE.ms,
    `${url}: navigate timed out after ${NAVIGATE.ms}ms, which is that size because ${NAVIGATE.why}`);
  await withTimeout(settled, NAVIGATE.ms,
    `${url}: the load event never fired, within ${NAVIGATE.ms}ms, which is that size because ${NAVIGATE.why}`);
  const ev = (expression: string) => evaluate(cdp, expression, sessionId);
  let painted: Painted = { ready: false, waitedMs: 0 };
  let threw: string | undefined;
  let reading: PageReading | undefined;
  try {
    painted = await ev(readyExpression(PAINTED)) as Painted;
    if (painted.ready) {
      const count = await ev(`${ISLANDS}.length`) as number;
      const palettes = await ev(PALETTES) as Record<string, string[]> & { nested: Record<string, string[]> };
      const islands: IslandReading[] = [];
      for (let index = 0; index < count; index += 1) {
        const palette = await ev(`${ISLANDS}[${index}].classList.contains('arena-light') ? 'light' : 'dark'`) as string;
        const other = palette === 'light' ? 'dark' : 'light';
        const read = await readIsland(cdp, sessionId, index);
        islands.push({ palette, island: palettes[palette] ?? [], outer: palettes[other] ?? [], nested: palettes.nested[palette] ?? [], ...read });
      }
      reading = { layer, theme, islands };
    }
  } catch (error) {
    if (!(error instanceof PageThrew)) throw error;
    threw = error.message;
  }
  const silence = await ev(REPORT).catch((error: unknown) => {
    if (error instanceof PageThrew) return undefined;
    throw error;
  }) as Silence | undefined;
  return { painted, threw, silence, reading };
}

export async function realSweep() {
  const sinks = SINK_LAYERS.map((layer) => existsSync(join(root, pagePath(layer, SINK))));
  if (!sinks.every(Boolean)) {
    return { problems: [`check-palette-islands: a layer draws no ${SINK} page; run bun run build, which emits the pages and bundles both layers`], pages: 0, islands: 0 };
  }
  const exe = browserOrExit('check-palette-islands');
  const server = await startStaticServer(root);
  const chrome = await launchChromium(exe);
  const cdp = await connect(chrome.wsUrl);
  const problems: string[] = [];
  let pages = 0;
  let islands = 0;
  let colours = 0;
  let bubbles = 0;
  try {
    for (const layer of SINK_LAYERS) {
      for (const theme of THEMES) {
        const url = `http://127.0.0.1:${server.port}/${pagePath(layer, SINK)}?theme=${theme}`;
        const name = `${layer} ${SINK}?theme=${theme}`;
        const { result, changed } = await loadInFreshTab(cdp,
          (sessionId) => readIn(cdp, sessionId, layer, theme, url),
          (one) => !one.painted.ready && one.threw === undefined);
        pages += 1;
        if (result.threw !== undefined) { problems.push(threwProblem(name, result.threw, result.silence)); continue; }
        if (!result.painted.ready && (changed as Lost[]).length > 0) { problems.push(networkChangedProblem(name, changed)); continue; }
        const unpainted = paintedProblem(name, PAINTED, result.painted, 'so no island was read', result.silence);
        if (unpainted !== null) { problems.push(unpainted); continue; }
        if ((result.silence?.errors.length ?? 0) > 0) {
          problems.push(`${name}: the page raised ${result.silence?.errors.length} error(s) while loading${silenceOf(result.silence)}`);
        }
        if (!result.reading) continue;
        islands += result.reading.islands.length;
        for (const one of result.reading.islands) { colours += one.painted.length; bubbles += one.bubbles; }
        problems.push(...readingProblems(result.reading));
      }
    }
  } finally {
    await chrome.kill?.();
    server.close?.();
  }
  return { problems, pages, islands, colours, bubbles };
}

if (isMainModule(import.meta.url)) {
  if (SINK_LAYERS.length < 2) cannotRun('check-palette-islands', 'a comparison needs two layers, and the emitter names fewer');
  await main();
}
