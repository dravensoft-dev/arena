/* No Arena part positioned absolutely leaves its own component. A part kept for assistive
 * technology (`sr-only`, a native input drawn `absolute opacity-0`) takes the nearest positioned
 * ancestor as its containing block, and when that ancestor lies outside the component the part is
 * not clipped by the scroller it sits in and the document's scrollable area grows to reach it.
 * Measured in a real browser over both layers' kitchen sinks, because happy-dom has no layout and
 * only a browser places an absolute part: every element whose computed position is absolute and
 * whose data-arena-part names a slot reports its offsetParent's part, and that holder must lie inside
 * the part's own component root (the nearest root element of that component, else its nearest slot),
 * so a part held by an enclosing instance of the same component still fails. Each HELD entry of check:hidden-parts whose part a sink draws must also be
 * held by the slot it names. A sweep that swept no sink, or found no absolute part, is a failure. */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { withTimeout } from '../../utils/with-timeout.ts';
import { kebab } from '../../utils/case.ts';
import { deadline, type Deadline } from '../../lib/arena/deadline.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { startStaticServer } from '../../lib/arena/static-server.ts';
import { browserOrExit, launchChromium } from '../../lib/arena/chromium.ts';
import { connect, evaluate, PageThrew } from '../../lib/arena/cdp.ts';
import type { Cdp } from '../../lib/arena/cdp.ts';
import { cannotRun } from '../../lib/arena/arena-scripts-vars.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { COLLECT, REPORT, type Painted, type Silence } from '../../lib/arena/page-errors.ts';
import { PAGE_FILE } from '../../lib/arena/kitchen-sink-page.ts';
import { SINK_LAYERS } from '../../generate/arena/generate-kitchen-sink.ts';
import { loadInFreshTab } from '../../lib/arena/page-load.ts';
import { PAINTED, loaded, readyExpression, sinksIn, pagePath, STILL } from './check-pixel-parity.ts';
import { unmeasuredProblem } from './check-target-size.ts';
import { HELD } from '../tailwind/check-hidden-parts.ts';

export const node = {
  name: 'check:contained-parts',
  reads: [
    'frameworks/react/kitchen-sink/**', 'frameworks/angular/kitchen-sink/**',
    'frameworks/react/components/**/*.generated.js', 'frameworks/react/*.generated.js',
    'frameworks/react/vendor/**', 'frameworks/angular/build/demo/**',
    'frameworks/tailwind/consume/**', 'contracts/design-generated/**',
    'contracts/design/*.css', 'contracts/design/density.comfortable.json',
    'contracts/design/density.compact.json',
    'assets/fonts/**', 'assets/Icons.generated.svg', 'assets/rotor-crimson.svg',
    'intro/kitchen-sink.css', 'intro/styles.css', 'intro/toggle.css', 'intro/theme.js',
    'plugin-style-store/**/plugin.css',
    'scripts/check/tailwind/check-hidden-parts.ts',
  ],
  writes: [],
  feeds: [],
};

export const NAVIGATE: Deadline = deadline('contained-parts:navigate', 30_000,
  'the page fetches the whole component barrel and its layer\'s bundle, so the first navigation of '
  + 'a sweep pays for a cold HTTP cache');

export const LOADED: Deadline = deadline('contained-parts:loaded', 30_000,
  'the wait that follows a navigation is the load event and not the navigate call, which settles '
  + 'at the commit and may precede the parser building a documentElement. It is the same size as '
  + 'the navigate above because it is the same fetch being waited on');

export const DESKTOP = { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false };

export type Placed = { layer: string; sink: string; part: string; holder: string | null; inside: boolean };

export const PLACED_EXPRESSION = `(() => {
  const out = [];
  for (const el of document.querySelectorAll('[data-arena-part]')) {
    const part = el.getAttribute('data-arena-part') ?? '';
    if (!part.includes('.')) continue;
    if (getComputedStyle(el).position !== 'absolute') continue;
    const holder = el.offsetParent;
    if (holder === null) continue;
    const prefix = part.split('.')[0];
    const own = el.closest('[data-arena-part="' + prefix + '"]')
      ?? el.parentElement?.closest('[data-arena-part^="' + prefix + '."]') ?? null;
    out.push({ part, holder: holder.getAttribute('data-arena-part'), inside: own !== null && own.contains(holder) });
  }
  return out;
})()`;

const prefixOf = (part: string) => part.split('.')[0] ?? '';

export function escapeProblems(rows: Placed[]): string[] {
  const escaping = new Map<string, { count: number; holder: string | null }>();
  for (const one of rows) {
    if (one.holder !== null && one.inside) continue;
    const key = `${one.layer}/${one.sink}/${one.part}`;
    const held = escaping.get(key);
    if (held) held.count += 1;
    else escaping.set(key, { count: 1, holder: one.holder });
  }
  return [...escaping.entries()].sort().map(([key, one]) =>
    `${key} is positioned absolutely and its containing block is ${one.holder ?? 'outside every Arena part'}, `
    + `which is not part of its own component (${one.count} instance(s)): position the component root`);
}

const partOf = (key: string) => {
  const [component = '', slot = ''] = key.split('.');
  return `${kebab(component).replace(/^arena-/, '')}.${kebab(slot)}`;
};

export const UNDRAWN = new Map<string, string>([
  ['ArenaSlider.thumbLabel', 'no kitchen sink draws a slider thumb value label, so only the static half of '
    + 'check:hidden-parts holds it'],
]);

export function heldProblems(rows: Placed[], held = HELD, undrawn = UNDRAWN): string[] {
  const problems: string[] = [];
  for (const [key, entry] of held) {
    const part = partOf(key);
    const drawn = rows.filter((one) => one.part === part);
    if (drawn.length === 0) {
      if (!undrawn.has(key)) {
        problems.push(`HELD ${key} is drawn by no sink in either layer (looked for ${part}), so nothing checked it: `
          + 'name the part the sinks draw, or list the entry in UNDRAWN with the reason');
      }
      continue;
    }
    const holder = `${prefixOf(part)}.${kebab(entry.by)}`;
    const wrong = drawn.filter((one) => one.holder !== holder);
    if (wrong.length === 0) continue;
    problems.push(`HELD ${key} says ${part} sits inside ${holder}, and ${wrong.length} of ${drawn.length} `
      + `drawn instance(s) sit inside ${[...new Set(wrong.map((one) => one.holder ?? 'no Arena part'))].sort().join(', ')}`);
  }
  for (const key of undrawn.keys()) {
    if (!held.has(key)) problems.push(`UNDRAWN ${key} is no HELD key, so the entry is stale`);
    else if (rows.some((one) => one.part === partOf(key))) {
      problems.push(`UNDRAWN ${key} is drawn by a sink after all, so the entry is stale`);
    }
  }
  return problems;
}

export function emptyProblems(rows: Placed[], sinks: string[], layers: string[] = SINK_LAYERS): string[] {
  const problems: string[] = [];
  if (sinks.length === 0) {
    problems.push('swept 0 kitchen sinks, so every part was compared against nothing; an empty sweep is a failure');
  }
  if (rows.length === 0) {
    problems.push('found 0 absolutely positioned Arena parts; the sinks draw tooltips, fills and hidden parts, '
      + 'so a sweep that finds none stopped reaching them');
    return problems;
  }
  for (const layer of layers) {
    if (!rows.some((one) => one.layer === layer)) {
      problems.push(`${layer} drew 0 absolutely positioned Arena parts in every sink, while the other layer's rows `
        + 'would have carried the sweep');
    }
  }
  const counts = new Map<string, Map<string, number>>();
  for (const one of rows) {
    const bySink = counts.get(one.sink) ?? new Map<string, number>();
    bySink.set(one.layer, (bySink.get(one.layer) ?? 0) + 1);
    counts.set(one.sink, bySink);
  }
  for (const [sink, bySink] of [...counts].sort()) {
    const per = layers.map((layer) => bySink.get(layer) ?? 0);
    if (new Set(per).size > 1) {
      problems.push(`${sink} draws ${layers.map((layer, at) => `${per[at]} in ${layer}`).join(' and ')} absolutely `
        + 'positioned parts, and the layers draw the same sink');
    }
  }
  return problems;
}

const skip: (reason: string) => never = (reason) => cannotRun('check-contained-parts', reason);

async function placedIn(cdp: Cdp, sessionId: string, url: string) {
  await cdp.send('Emulation.setDeviceMetricsOverride', DESKTOP, sessionId);
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: COLLECT }, sessionId);
  const settled = loaded(cdp, sessionId);
  await withTimeout(cdp.send('Page.navigate', { url }, sessionId), NAVIGATE.ms,
    `${url}: navigate timed out after ${NAVIGATE.ms}ms, which is that size because ${NAVIGATE.why}`);
  await withTimeout(settled, LOADED.ms,
    `${url}: the load event never fired, within ${LOADED.ms}ms, which is that size because ${LOADED.why}`);
  const ev = (expression: string) => evaluate(cdp, expression, sessionId);

  let painted: Painted = { ready: false, waitedMs: 0 };
  let rows: { part: string; holder: string | null; inside: boolean }[] = [];
  let threw: string | undefined;
  try {
    painted = await ev(readyExpression(PAINTED));
    if (painted.ready) {
      await ev(STILL);
      rows = await ev(PLACED_EXPRESSION) ?? [];
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
}

async function sweep(cdp: Cdp, url: string) {
  const { result, changed } = await loadInFreshTab(cdp,
    (sessionId) => placedIn(cdp, sessionId, url),
    (one) => !one.painted.ready && one.threw === undefined);
  return { ...result, changed };
}

async function main() {
  const sinks = [...new Set(SINK_LAYERS.flatMap((layer) => sinksIn(layer)))].sort();
  const exe = browserOrExit('check-contained-parts');
  const server = sinks.length === 0 ? null : await startStaticServer(root);
  const chrome = sinks.length === 0 ? null : await launchChromium(exe);
  const cdp = chrome ? await connect(chrome.wsUrl) : null;
  const rows: Placed[] = [];
  const problems: string[] = [];
  try {
    if (cdp && server) {
      for (const sink of sinks) {
        for (const layer of SINK_LAYERS) {
          if (!sinksIn(layer).includes(sink)) continue;
          const url = `http://127.0.0.1:${server.port}/${pagePath(layer, sink)}`;
          const one = await sweep(cdp, url);
          const unmeasured = unmeasuredProblem(`${sink} ${layer}: the page`, one);
          if (unmeasured !== null) { problems.push(unmeasured); continue; }
          for (const found of one.rows) rows.push({ layer, sink, ...found });
        }
      }
    }
  } finally {
    await chrome?.kill?.();
    server?.close?.();
  }

  problems.push(...emptyProblems(rows, sinks), ...escapeProblems(rows), ...heldProblems(rows));

  if (problems.length) {
    const shown = problems.slice(0, 40);
    console.error(`check-contained-parts: ${problems.length} problem(s)\n`);
    for (const p of shown) console.error(`  ${p}`);
    if (problems.length > shown.length) console.error(`\n  ...and ${problems.length - shown.length} more`);
    process.exit(1);
  }
  const counts = SINK_LAYERS.flatMap((layer) => sinksIn(layer).map((sink) =>
    `${layer}/${sink} ${rows.filter((one) => one.layer === layer && one.sink === sink).length}`));
  console.log(`check-contained-parts: ${rows.length} absolutely positioned part(s) in a real browser at `
    + `${DESKTOP.width}x${DESKTOP.height} (${counts.join(', ')}), every one inside its own component`);
}

if (isMainModule(import.meta.url)) {
  if (!existsSync(join(root, 'frameworks/react/kitchen-sink'))) {
    skip(`no kitchen-sink page is emitted; run bun run build, which writes ${PAGE_FILE} per arrangement`);
  }
  await main();
}
