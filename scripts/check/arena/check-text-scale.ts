/* Loads the kitchen sinks in a browser whose default font size is 32px, twice the 16 it ships with, and
 * reports text that did not double, text clipped by its own box and sibling text that now overlaps. The
 * 16px reference is the same pages in a second browser, dark only, matched by slot. The judges are pure
 * over the records the page returns. A root that is not 32px fails naming what it measured, so a browser
 * that ignored the preference cannot pass on pages that never grew. A truncating slot (ellipsis, line
 * clamp), a 1px clip box (visually hidden text) and an absolutely positioned, floated or inline box
 * (its rect spans its wrapped lines) are not reported. FIXED, CLIPS and OVERLAPS are keyed
 * <layer>/<sink>:<data-arena-part or tag>, carry a reason, and fail when they silence nothing. */

import { withTimeout } from '../../utils/with-timeout.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { startStaticServer } from '../../lib/arena/static-server.ts';
import { browserOrExit, launchChromium } from '../../lib/arena/chromium.ts';
import { connect, evaluate, PageThrew } from '../../lib/arena/cdp.ts';
import type { Cdp } from '../../lib/arena/cdp.ts';
import { cannotRun } from '../../lib/arena/arena-scripts-vars.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { COLLECT, REPORT, paintedProblem, threwProblem, type Painted, type Silence } from '../../lib/arena/page-errors.ts';
import { loadInFreshTab, networkChangedProblem } from '../../lib/arena/page-load.ts';
import { SINK_LAYERS } from '../../generate/arena/generate-kitchen-sink.ts';
import {
  NAVIGATE, PAINTED, THEMES, VIEWPORT, STILL, loaded, readyExpression, sinksIn, pagePath, stableHeightExpression,
  type Rect,
} from './check-pixel-parity.ts';

export const node = {
  name: 'check:text-scale',
  reads: [
    'frameworks/react/kitchen-sink/**', 'frameworks/angular/kitchen-sink/**',
    'frameworks/react/components/**/*.generated.js', 'frameworks/react/*.generated.js',
    'frameworks/react/vendor/**', 'frameworks/angular/build/demo/**',
    'frameworks/tailwind/consume/**', 'contracts/design-generated/**',
    'contracts/design/*.css', 'assets/fonts/**', 'assets/Icons.generated.svg', 'assets/rotor-crimson.svg',
    'intro/kitchen-sink.css', 'intro/styles.css', 'intro/toggle.css', 'intro/theme.js',
    'plugin-style-store/**/plugin.css',
  ],
  writes: [],
  feeds: [],
};

export const ENLARGED_PX = 32;

export const REFERENCE_PX = 16;

export const DOUBLING_TOLERANCE_PX = 0.5;

export const SCOPES = ['arena-compact', 'arena-comfortable'] as const;

export type TextBox = {
  path: string; text: string; fontSize: number; clipX: boolean; clipY: boolean; truncates: boolean;
  rect: Rect; parent: string; inFlow: boolean; classes?: string;
};

const LOGO_WHY = 'the logo lock-up is the brand scale: spacing.json declares the logo.* dimensions on the fixed '
  + 'axis, so the wordmark is drawn at the size the brand manual gives it and does not follow the reader\'s text size';

export const FIXED = new Map<string, string>(SINK_LAYERS.flatMap((layer) =>
  ['default', 'complete'].flatMap((sink) => ['app-logo.name', 'app-logo.dim'].map((part) =>
    [`${layer}/${sink}:${part}`, LOGO_WHY] as [string, string]))));

export const CLIPS = new Map<string, string>([]);

export const OVERLAPS = new Map<string, string>([]);

export function slotOf(path: string) {
  const at = path.indexOf('#');
  return at === -1 ? path : path.slice(0, at);
}

export function rootProblems(rootPx: number, what = 'the page'): string[] {
  if (rootPx === ENLARGED_PX) return [];
  return [`${what}: the root font size measured ${rootPx}px and this sweep sets the browser default to `
    + `${ENLARGED_PX}px, so the browser ignored the preference or the page pins the root, and nothing `
    + 'measured here says anything about larger text'];
}

export function doublingProblems(at16: TextBox[], at32: TextBox[], fixed: Map<string, string>,
  used: Set<string> = new Set()): string[] {
  const before = new Map(at16.map((one) => [one.path, one]));
  const problems: string[] = [];
  for (const now of at32) {
    const then = before.get(now.path);
    if (!then || then.fontSize <= 0) continue;
    if (Math.abs(now.fontSize - then.fontSize * 2) <= DOUBLING_TOLERANCE_PX) continue;
    const slot = slotOf(now.path);
    if (fixed.has(slot)) { used.add(slot); continue; }
    problems.push(`${now.path}: "${now.text}" is ${then.fontSize}px at a 16px default and ${now.fontSize}px at `
      + `${ENLARGED_PX}px, so it did not double`);
  }
  return problems;
}

export function clipProblems(boxes: TextBox[], allowed: Map<string, string>, used: Set<string> = new Set()): string[] {
  const problems: string[] = [];
  for (const one of boxes) {
    if (!(one.clipX || one.clipY) || one.truncates) continue;
    const slot = slotOf(one.path);
    if (allowed.has(slot)) { used.add(slot); continue; }
    problems.push(`${one.path}: "${one.text}" is clipped${one.clipX ? ' across' : ''}${one.clipY ? ' down' : ''} by its `
      + `own box, and the slot does not truncate on purpose${one.classes ? ` (classes: ${one.classes})` : ''}`);
  }
  return problems;
}

export function overlapProblems(boxes: TextBox[], allowed: Map<string, string>, used: Set<string> = new Set()): string[] {
  const problems: string[] = [];
  const flowing = boxes.filter((one) => one.inFlow);
  for (let i = 0; i < flowing.length; i += 1) {
    for (let j = i + 1; j < flowing.length; j += 1) {
      const a = flowing[i];
      const b = flowing[j];
      if (!a || !b || a.parent !== b.parent) continue;
      const across = Math.min(a.rect.right, b.rect.right) - Math.max(a.rect.left, b.rect.left);
      const down = Math.min(a.rect.bottom, b.rect.bottom) - Math.max(a.rect.top, b.rect.top);
      if (across <= 1 || down <= 1) continue;
      const slots = [slotOf(a.path), slotOf(b.path)];
      const allowedSlots = slots.filter((slot) => allowed.has(slot));
      if (allowedSlots.length > 0) { for (const slot of allowedSlots) used.add(slot); continue; }
      problems.push(`${a.path} "${a.text}" and ${b.path} "${b.text}" share a parent and overlap by `
        + `${Math.round(across)}px across and ${Math.round(down)}px down`);
    }
  }
  return problems;
}

export function staleAllowanceProblems(used: Set<string>, allowed: Map<string, string>, what = 'allowance'): string[] {
  return [...allowed.entries()].filter(([slot]) => !used.has(slot)).map(([slot, why]) =>
    `${what} ${slot} silenced nothing in this sweep, so it outlived what it excused (${why})`);
}

export function breakpointProblems(at: { bpMd: string; below1530: boolean; below1540: boolean }): string[] {
  const problems: string[] = [];
  if (at.bpMd !== '48rem') {
    problems.push(`--bp-md reads ${JSON.stringify(at.bpMd)} and it is declared as 48rem, so it does not follow the root font size`);
  }
  if (!at.below1530 || at.below1540) {
    problems.push(`at ${ENLARGED_PX}px the md query must be off at a 1530px viewport and on at 1540px `
      + `(48em is 1536px); measured off at 1530: ${at.below1530}, off at 1540: ${at.below1540}`);
  }
  return problems;
}

export const collectExpression = (layer: string, sink: string, scope: string) => `(() => {
  const html = document.documentElement;
  for (const one of ${JSON.stringify([...SCOPES])}) html.classList.remove(one);
  html.classList.add(${JSON.stringify(scope)});
  const prefix = ${JSON.stringify(`${layer}/${sink}`)};
  const SKIP = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'HEAD']);
  const ids = new Map();
  const idOf = (el) => { if (!ids.has(el)) ids.set(el, 'p' + ids.size); return ids.get(el); };
  const counts = new Map();
  const out = [];
  for (const el of document.body.querySelectorAll('*')) {
    if (SKIP.has(el.tagName)) continue;
    const text = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join(' ').replace(/\\s+/g, ' ').trim();
    if (!text) continue;
    const host = el.closest('[data-arena-part]');
    const own = el.getAttribute('data-arena-part');
    const key = own ?? ((host ? host.getAttribute('data-arena-part') : 'page') + '>' + el.tagName.toLowerCase());
    const n = counts.get(key) ?? 0;
    counts.set(key, n + 1);
    if (!host) continue;
    if (el.getClientRects().length === 0) continue;
    const style = getComputedStyle(el);
    if (style.visibility === 'hidden' || style.display === 'none') continue;
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    let clipper = null;
    for (let at = el; at && at !== document.body; at = at.parentElement) {
      const s = getComputedStyle(at);
      if (s.overflowX !== 'visible' || s.overflowY !== 'visible') { clipper = { at, s }; break; }
    }
    let clipX = false;
    let clipY = false;
    let truncates = false;
    let classes = '';
    if (clipper && clipper.at.clientWidth <= 1 && clipper.at.clientHeight <= 1) continue;
    if (clipper) {
      const { at, s } = clipper;
      clipX = s.overflowX !== 'visible' && at.scrollWidth > at.clientWidth + 1;
      clipY = s.overflowY !== 'visible' && at.scrollHeight > at.clientHeight + 1;
      truncates = s.textOverflow === 'ellipsis' || (s.webkitLineClamp && s.webkitLineClamp !== 'none')
        || style.textOverflow === 'ellipsis';
      classes = String(at.getAttribute('class') ?? at.tagName.toLowerCase());
    }
    const sibling = el.parentElement;
    out.push({
      path: prefix + ':' + key + '#' + n,
      text: text.slice(0, 40),
      fontSize: parseFloat(style.fontSize),
      clipX, clipY, truncates: Boolean(truncates),
      rect: { left: r.left + scrollX, top: r.top + scrollY, right: r.right + scrollX, bottom: r.bottom + scrollY },
      parent: sibling ? idOf(sibling) : 'root',
      inFlow: style.position !== 'absolute' && style.position !== 'fixed' && style.cssFloat === 'none'
        && style.display !== 'inline',
      classes,
    });
  }
  return { root: parseFloat(getComputedStyle(html).fontSize), boxes: out };
})()`;

export const BREAKPOINT_EXPRESSION = `(() => ({
  bpMd: getComputedStyle(document.documentElement).getPropertyValue('--bp-md').trim(),
  matches: matchMedia('(min-width: 48em)').matches,
}))()`;

type Collected = { root: number; boxes: TextBox[] };

async function visit<T>(cdp: Cdp, url: string, run: (ev: (e: string) => Promise<any>, sessionId: string) => Promise<T>,
  size: { width: number; height: number }) {
  const { result, changed } = await loadInFreshTab(cdp, async (sessionId) => {
    await cdp.send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, ...size }, sessionId);
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
    let value: T | undefined;
    let threw: string | undefined;
    try {
      painted = await ev(readyExpression(PAINTED));
      if (painted.ready) { await ev(STILL); value = await run(ev, sessionId); }
    } catch (error) {
      if (!(error instanceof PageThrew)) throw error;
      threw = error.message;
    }
    const silence = await ev(REPORT).catch((error: unknown) => {
      if (error instanceof PageThrew) return undefined;
      throw error;
    }) as Silence | undefined;
    return { value, painted, silence, threw };
  }, (one) => !one.painted.ready && one.threw === undefined);
  return { ...result, changed };
}

export async function collectPage(cdp: Cdp, url: string, layer: string, sink: string) {
  return visit(cdp, url, async (ev) => {
    const byScope = new Map<string, Collected>();
    for (const scope of SCOPES) {
      await ev(collectExpression(layer, sink, scope));
      await ev(stableHeightExpression(PAINTED));
      byScope.set(scope, await ev(collectExpression(layer, sink, scope)) as Collected);
    }
    return byScope;
  }, VIEWPORT);
}

export async function breakpointPage(cdp: Cdp, url: string) {
  return visit(cdp, url, async (ev, sessionId) => {
    const read = async (width: number) => {
      await cdp.send('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, width }, sessionId);
      return await ev(BREAKPOINT_EXPRESSION) as { bpMd: string; matches: boolean };
    };
    const at1530 = await read(1530);
    const at1540 = await read(1540);
    return { bpMd: at1530.bpMd, below1530: !at1530.matches, below1540: !at1540.matches };
  }, VIEWPORT);
}

const skip: (reason: string) => never = (reason) => cannotRun('check-text-scale', reason);

type Page = { layer: string; sink: string; theme: string };

async function main() {
  const pages: Page[] = SINK_LAYERS.flatMap((layer) => sinksIn(layer).flatMap((sink) =>
    THEMES.map((theme) => ({ layer, sink, theme }))));
  if (pages.length === 0) {
    console.error('check-text-scale: found 0 kitchen-sink page(s). An empty sweep is a failure rather '
      + 'than a clean pass: run bun run build, which emits the pages and bundles both layers.');
    process.exit(1);
  }
  const exe = browserOrExit('check-text-scale');
  const server = await startStaticServer(root);
  const big = await launchChromium(exe, undefined, { defaultFontSize: ENLARGED_PX });
  const small = await launchChromium(exe, undefined, { defaultFontSize: REFERENCE_PX });
  const problems = new Map<string, Set<string>>();
  const note = (message: string, where: string) => {
    const seen = problems.get(message) ?? new Set<string>();
    seen.add(where);
    problems.set(message, seen);
  };
  const usedFixed = new Set<string>();
  const usedClips = new Set<string>();
  const usedOverlaps = new Set<string>();
  let measured = 0;
  let unmatched = 0;
  try {
    const cdpBig = await connect(big.wsUrl);
    const cdpSmall = await connect(small.wsUrl);
    const url = (page: Page) => `http://127.0.0.1:${server.port}/${pagePath(page.layer, page.sink)}?theme=${page.theme}`;
    const first = pages[0] as Page;
    const bp = await breakpointPage(cdpBig, url(first));
    if (bp.value) for (const one of breakpointProblems(bp.value)) note(one, 'breakpoint');
    else note(`${first.layer}/${first.sink}: the breakpoint probe did not paint`, 'breakpoint');
    const reference = new Map<string, Collected>();
    for (const page of pages.filter((one) => one.theme === 'dark')) {
      const what = `${page.layer}/${page.sink}:dark at ${REFERENCE_PX}px`;
      const got = await collectPage(cdpSmall, url(page), page.layer, page.sink);
      if (!got.value) { note(unpainted(what, got), what); continue; }
      for (const [scope, collected] of got.value) {
        if (collected.root !== REFERENCE_PX) note(`${what}: the reference root measured ${collected.root}px`, what);
        reference.set(`${page.layer}/${page.sink}/${scope}`, collected);
      }
    }
    for (const page of pages) {
      const what = `${page.layer}/${page.sink}:${page.theme}`;
      const got = await collectPage(cdpBig, url(page), page.layer, page.sink);
      if (!got.value) { note(unpainted(what, got), what); continue; }
      for (const [scope, collected] of got.value) {
        const where = `${what}/${scope}`;
        measured += collected.boxes.length;
        for (const one of rootProblems(collected.root, what)) note(one, where);
        const base = reference.get(`${page.layer}/${page.sink}/${scope}`);
        if (base) {
          const known = new Set(base.boxes.map((one) => one.path));
          unmatched += collected.boxes.filter((one) => !known.has(one.path)).length;
          for (const one of doublingProblems(base.boxes, collected.boxes, FIXED, usedFixed)) note(one, where);
        }
        for (const one of clipProblems(collected.boxes, CLIPS, usedClips)) note(one, where);
        for (const one of overlapProblems(collected.boxes, OVERLAPS, usedOverlaps)) note(one, where);
      }
    }
  } finally {
    await big.kill?.();
    await small.kill?.();
    server.close?.();
  }
  if (measured === 0) note('measured 0 text boxes, so every judge compared nothing', 'sweep');
  for (const one of [
    ...staleAllowanceProblems(usedFixed, FIXED, 'FIXED'),
    ...staleAllowanceProblems(usedClips, CLIPS, 'CLIPS'),
    ...staleAllowanceProblems(usedOverlaps, OVERLAPS, 'OVERLAPS'),
  ]) note(one, 'allowances');

  if (problems.size > 0) {
    console.error(`check-text-scale: ${problems.size} problem(s) over ${measured} text box(es)\n`);
    for (const [message, where] of [...problems].sort(([a], [b]) => a.localeCompare(b))) {
      console.error(`  ${message}\n      seen in: ${[...where].sort().join(', ')}`);
    }
    process.exit(1);
  }
  console.log(`check-text-scale: ${measured} text box(es) measured at a ${ENLARGED_PX}px browser default across `
    + `${pages.length} page(s), every one doubled, unclipped and clear of its siblings (${unmatched} unmatched)`);
}

function unpainted(what: string, got: { painted: Painted; silence?: Silence; threw?: string; changed: any[] }) {
  if (got.threw !== undefined) return threwProblem(what, got.threw, got.silence);
  if (!got.painted.ready && got.changed.length > 0) return networkChangedProblem(what, got.changed);
  return paintedProblem(what, PAINTED, got.painted, 'so this page was measured against nothing', got.silence)
    ?? `${what}: the page did not paint`;
}

if (isMainModule(import.meta.url)) {
  if (sinksIn('react').length === 0) skip('no kitchen-sink page is emitted; run bun run build');
  await main();
}
