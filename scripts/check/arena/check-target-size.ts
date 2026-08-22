/* Every activation target Arena draws clears the floor its density commits to. Measured in a real
 * browser over the page check:pixel-parity renders, because happy-dom has no layout and a unit-tier
 * gate would pass a 20px box and a 48px one identically. It measures the ACTIVATION box, never the
 * painted one: a checkbox's target is the label around its 20px tick, and a dense control answers a
 * thumb through an absolutely-positioned pseudo-element rather than by growing, so both are unioned
 * in. Only an element inside a data-arena-part is measured, since check:parts already asserts every
 * painted slot carries one and an unnamed control is the harness's own chrome. Two renders, and the
 * second is the point: nothing else here draws .arena-comfortable, the density Arena names as its
 * answer to WCAG 2.5.8. UNSIZED holds the one exception that is a geometry rather than a control
 * left small, with the measurement that produced it, and a stale entry fails. */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { withTimeout } from '../../utils/with-timeout.ts';
import { deadline, type Deadline } from '../../lib/arena/deadline.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { startStaticServer } from '../../lib/arena/static-server.ts';
import { browserOrExit, launchChromium } from '../../lib/arena/chromium.ts';
import { connect, evaluate, PageThrew } from '../../lib/arena/cdp.ts';
import type { Cdp } from '../../lib/arena/cdp.ts';
import { cannotRun } from '../../lib/arena/arena-scripts-vars.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import {
  COLLECT, REPORT, paintedProblem, threwProblem, type Painted, type Silence,
} from '../../lib/arena/page-errors.ts';
import { PAGE_FILE } from '../../lib/arena/kitchen-sink-page.ts';
import { SINK_LAYERS } from '../../generate/arena/generate-kitchen-sink.ts';
import { PAINTED, loaded, readyExpression, sinksIn, pagePath, STILL } from './check-pixel-parity.ts';

export const node = {
  name: 'check:target-size',
  reads: [
    'frameworks/react/kitchen-sink/**', 'frameworks/angular/kitchen-sink/**',
    'frameworks/react/components/**/*.generated.js', 'frameworks/react/*.generated.js',
    'frameworks/react/vendor/**', 'frameworks/angular/build/demo/**',
    'frameworks/tailwind/consume/**', 'contracts/design-generated/**',
    'contracts/design/*.css', 'assets/fonts/**', 'assets/rotor-crimson.svg',
    'intro/kitchen-sink.css', 'intro/styles.css', 'intro/toggle.css', 'intro/theme.js',
    'plugin-style-store/**/plugin.css',
  ],
  writes: [],
  feeds: [],
};

export const NAVIGATE: Deadline = deadline('target-size:navigate', 30_000,
  'the page fetches the whole component barrel and its layer\'s bundle, so the first navigation of '
  + 'a sweep pays for a cold HTTP cache');

export const LOADED: Deadline = deadline('target-size:loaded', 30_000,
  'the wait that follows a navigation is the load event and not the navigate call, which settles '
  + 'at the commit: the response headers have arrived there and the parser may not have built a '
  + 'documentElement yet, so a page read at that moment answers about a document with no root. '
  + 'It is the same size as the navigate above because it is the same fetch being waited on');

export const PHONE = { width: 390, height: 844, deviceScaleFactor: 1, mobile: true };

export type Scope = { name: string; klass: string; floor: number; why: string };

export const SCOPES: Scope[] = [
  { name: 'base', klass: '', floor: 24,
    why: 'WCAG 2.5.8 at its minimum level, which is what the 40px base control height is sized past '
      + 'and what everything smaller than a control still owes' },
  { name: 'comfortable', klass: 'arena-comfortable', floor: 44,
    why: 'WCAG 2.5.8 at its enhanced level, and the number Apple asks for a tappable area. '
      + 'density.comfortable.json argues its own 48px against exactly this figure, and this is the '
      + 'scope where that argument is drawn rather than only written' },
];

export const INTERACTIVE = [
  'a[href]', 'button', 'input:not([type="hidden"])', 'select', 'textarea', 'summary',
  '[role="button"]', '[role="link"]', '[role="tab"]', '[role="menuitem"]', '[role="menuitemcheckbox"]',
  '[role="menuitemradio"]', '[role="option"]', '[role="switch"]', '[role="checkbox"]', '[role="radio"]',
  '[tabindex]:not([tabindex="-1"])',
];

export const UNSIZED = new Map<string, string>([
  ['calendar.cell', 'a month grid gives each of its seven columns a seventh of the width it '
    + 'is given, so a floor on the cell is a floor on the calendar\'s own minimum width. Seven cells '
    + 'at the enhanced floor need 308px before any gap or padding, and the widest a phone-shaped '
    + 'container hands the grid inside a padded surface is under 280. Removing this entry means '
    + 'deciding that the month scrolls sideways below that width rather than shrinking, which is a '
    + 'decision about the calendar and not about the floor'],
]);

export type Measured = { layer: string; scope: string; part: string; tag: string; role: string;
  width: number; height: number; exempt: string };

export function measureExpression(selectors: string[], klass: string) {
  return `(() => {
    const root = document.documentElement;
    const body = document.body;
    for (const scope of ['arena-comfortable', 'arena-compact']) body.classList.remove(scope);
    if (${JSON.stringify(klass)}) body.classList.add(${JSON.stringify(klass)});
    const FIELD = new Set(['INPUT', 'SELECT', 'TEXTAREA']);
    const activation = (el) => {
      if (!FIELD.has(el.tagName)) return el;
      const label = el.closest('label');
      if (label) return label;
      let at = el;
      for (let up = 0; up < 3 && at.parentElement; up += 1) {
        at = at.parentElement;
        if (at.hasAttribute('data-arena-part')) return at;
      }
      return el;
    };
    const hitArea = (el, rect) => {
      let width = rect.width;
      let height = rect.height;
      for (const pseudo of ['::before', '::after']) {
        const style = getComputedStyle(el, pseudo);
        if (style.content === 'none' || style.position !== 'absolute') continue;
        width = Math.max(width, parseFloat(style.width) || 0);
        height = Math.max(height, parseFloat(style.height) || 0);
      }
      return { width, height };
    };
    const seen = new Set();
    const out = [];
    for (const el of root.querySelectorAll(${JSON.stringify(selectors.join(', '))})) {
      const box = activation(el);
      if (seen.has(box)) continue;
      seen.add(box);
      const named = box.closest('[data-arena-part]') ?? el.closest('[data-arena-part]');
      if (!named) continue;
      const rect = box.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) continue;
      const style = getComputedStyle(box);
      if (style.visibility === 'hidden' || style.display === 'none') continue;
      const hit = hitArea(box, rect);
      const inProse = !!box.closest('p, .arena-prose');
      out.push({
        part: named.getAttribute('data-arena-part'),
        tag: box.tagName.toLowerCase(),
        role: box.getAttribute('role') ?? '',
        width: Math.round(hit.width * 100) / 100,
        height: Math.round(hit.height * 100) / 100,
        exempt: inProse && box.tagName === 'A' ? 'prose-inline' : '',
      });
    }
    return out;
  })()`;
}

export function undersized(measured: Measured[], scopes = SCOPES, unsized = UNSIZED) {
  const floorOf = new Map(scopes.map((s) => [s.name, s.floor]));
  const worst = new Map<string, Measured & { floor: number; count: number }>();
  for (const one of measured) {
    if (one.exempt && unsized.has(one.exempt)) continue;
    if (unsized.has(one.part)) continue;
    const floor = floorOf.get(one.scope);
    if (floor === undefined) continue;
    const short = Math.min(one.width, one.height);
    if (short >= floor) continue;
    const key = `${one.scope}/${one.part}`;
    const held = worst.get(key);
    if (!held) { worst.set(key, { ...one, floor, count: 1 }); continue; }
    held.count += 1;
    if (short < Math.min(held.width, held.height)) Object.assign(held, one);
  }
  return [...worst.entries()].sort().map(([key, one]) =>
    `${key} draws a ${one.width}x${one.height} activation target on a <${one.tag}`
    + `${one.role ? ` role=${one.role}` : ''}>, and the floor for this scope is ${one.floor}px`
    + `${one.count > 1 ? ` (${one.count} instance(s), the smallest shown)` : ''}`);
}

export function staleUnsizedProblems(measured: Measured[], unsized = UNSIZED) {
  const seen = new Set([...measured.map((m) => m.exempt), ...measured.map((m) => m.part)].filter(Boolean));
  return [...unsized.keys()]
    .filter((key) => !seen.has(key))
    .map((key) => `UNSIZED excuses ${key} and this sweep measured no target of that kind, so the `
      + 'exception outlived what it excused, or the walk stopped reaching it');
}

export function zeroMeasuredProblems(count: number, scopes: number) {
  const problems: string[] = [];
  if (count === 0) {
    problems.push('measured 0 activation targets, so every floor below was compared against '
      + 'nothing; a sweep that finds no control is a failure rather than a clean pass');
  }
  if (scopes < 2) {
    problems.push('fewer than two density scopes were rendered, and the second is the whole point: '
      + 'the density Arena names as its answer to WCAG 2.5.8 is the one nothing else in this '
      + 'repository ever draws');
  }
  return problems;
}

const skip: (reason: string) => never = (reason) => cannotRun('check-target-size', reason);

async function measure(cdp: Cdp, url: string, scope: Scope) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  try {
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Emulation.setDeviceMetricsOverride', PHONE, sessionId);
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: COLLECT }, sessionId);
    const settled = loaded(cdp, sessionId);
    await withTimeout(cdp.send('Page.navigate', { url }, sessionId), NAVIGATE.ms,
      `${url}: navigate timed out after ${NAVIGATE.ms}ms, which is that size because ${NAVIGATE.why}`);
    await withTimeout(settled, LOADED.ms,
      `${url}: the load event never fired, within ${LOADED.ms}ms, which is that size because ${LOADED.why}`);
    const ev = (expression: string) => evaluate(cdp, expression, sessionId);

    let painted: Painted = { ready: false, waitedMs: 0 };
    let rows: Measured[] = [];
    let threw: string | undefined;
    try {
      painted = await ev(readyExpression(PAINTED));
      if (painted.ready) {
        await ev(STILL);
        rows = await ev(measureExpression(INTERACTIVE, scope.klass)) ?? [];
      }
    } catch (error) {
      if (!(error instanceof PageThrew)) throw error;
      threw = error.message;
    }
    const silence = await ev(REPORT).catch((error: unknown) => {
      if (error instanceof PageThrew) return undefined;
      throw error;
    }) as Silence | undefined;
    return { rows, painted, silence, threw };
  } finally {
    await cdp.send('Target.closeTarget', { targetId });
  }
}

async function main() {
  const byLayer = new Map(SINK_LAYERS.map((layer) => [layer, sinksIn(layer)]));
  const sinks = (byLayer.get('react') ?? []).filter((one) => (byLayer.get('angular') ?? []).includes(one));
  if (sinks.length === 0) {
    console.error('check-target-size: found 0 kitchen-sink page(s). An empty sweep is a failure '
      + 'rather than a clean pass: run bun run build, which emits the pages and bundles both layers.');
    process.exit(1);
  }
  const exe = browserOrExit('check-target-size');
  const server = await startStaticServer(root);
  const chrome = await launchChromium(exe);
  const cdp = await connect(chrome.wsUrl);
  const measured: Measured[] = [];
  const problems: string[] = [];
  try {
    for (const sink of sinks) {
      for (const layer of SINK_LAYERS) {
        for (const scope of SCOPES) {
          const url = `http://127.0.0.1:${server.port}/${pagePath(layer, sink)}`;
          const what = `${sink} ${scope.name}/${layer}: the page`;
          const { rows, painted, silence, threw } = await measure(cdp, url, scope);
          if (threw !== undefined) { problems.push(threwProblem(what, threw, silence)); continue; }
          const unpainted = paintedProblem(what, PAINTED, painted,
            'so this density was measured against nothing', silence);
          if (unpainted !== null) { problems.push(unpainted); continue; }
          for (const row of rows) measured.push({ ...row, layer, scope: scope.name });
        }
      }
    }
  } finally {
    await chrome.kill?.();
    server.close?.();
  }

  problems.push(
    ...zeroMeasuredProblems(measured.length, new Set(measured.map((one) => one.scope)).size),
    ...undersized(measured),
    ...staleUnsizedProblems(measured),
  );

  if (problems.length) {
    const shown = problems.slice(0, 40);
    console.error(`check-target-size: ${problems.length} problem(s)\n`);
    for (const p of shown) console.error(`  ${p}`);
    if (problems.length > shown.length) console.error(`\n  ...and ${problems.length - shown.length} more`);
    process.exit(1);
  }
  const counts = SCOPES.map((s) => `${measured.filter((m) => m.scope === s.name).length} in ${s.name}`);
  console.log(`check-target-size: ${measured.length} activation target(s) measured in a real browser `
    + `at ${PHONE.width}x${PHONE.height} (${counts.join(', ')}), every one of them past its scope's floor`);
}

if (isMainModule(import.meta.url)) {
  if (!existsSync(join(root, 'frameworks/react/kitchen-sink'))) {
    skip(`no kitchen-sink page is emitted; run bun run build, which writes ${PAGE_FILE} per arrangement`);
  }
  await main();
}
