/* Measures the vocabulary's cascade in Chromium: each case's tree for each layer, rebuilt with the
 * real component and family sheets plus the fixture's witness family, in both load orders, and
 * judged by the width of its subject or by a channel on it. Happy-dom implements no @scope and no
 * layout, so this is the only place proximity, boundaries and load order are proved; the suites
 * hold each layer's DOM to the tree measured here. A fixture with no recorded tree fails. The
 * markup cases measure the computed style of classes an adopter writes, in both orders and with
 * no layer; a null in a case's expect is unrecorded and fails with the map to paste. The page is
 * pinned at 800x600 on the fixture's own origin, where a face loads, and a markup case waits for
 * its subject's face, so a 100dvh and a ch measure the same on every machine. */

import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { withTimeout } from '../../utils/with-timeout.ts';
import { deadline, type Deadline } from '../../lib/arena/deadline.ts';
import { POLL_MS } from '../../lib/arena/wait-for.ts';
import { startStaticServer } from '../../lib/arena/static-server.ts';
import { browserOrExit, launchChromium } from '../../lib/arena/chromium.ts';
import { connect, evaluate } from '../../lib/arena/cdp.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { arenaClassesFor, arenaSlotDataFor, classesManifest } from '../../lib/tailwind/component-css.ts';
import { VOCABULARY_SHEETS, compileFamily, declarations } from '../../lib/tailwind/vocabulary.ts';
import { pascal } from '../../utils/case.ts';
import { readProximity, treeHtml, SUBJECT, type PartData, type ProximityCase, type MarkupCase, type WitnessFamily } from '../../lib/arena/proximity.ts';
import { readManifests } from './check-measured-box.ts';
import { loaded as loadFired } from './check-pixel-parity.ts';
import type { ComponentManifest } from '../../lib/tailwind/manifest-shapes.ts';

export const node = {
  name: 'check:proximity',
  reads: ['scripts/check/arena/proximity-cases.json', `${VOCABULARY_SHEETS}/**`, 'frameworks/tailwind/consume/**',
    'frameworks/tailwind/components/**/*.manifest.json', 'intro/styles.css', 'contracts/design-generated/**', 'contracts/design/*.css'],
  writes: [],
  feeds: [],
};

export const CONTAINER_WIDTH = 480;
export const VIEWPORT = { width: 800, height: 600, deviceScaleFactor: 1, mobile: false };

export const LOADED: Deadline = deadline('proximity:loaded', 20_000,
  'a case page links every component sheet and the tokens one by one from the static server, and is '
  + 'measured only once every sheet has parsed');

export const LOADED_MARGIN: Deadline = deadline('proximity:loaded-margin', 1_000,
  'the in-page wait resolves false at its own deadline, and this is the time the answer takes to cross CDP');

export const NAVIGATE: Deadline = deadline('proximity:navigate', 30_000,
  'the first page is one small file from the local static server, and every case is written into it');

export const FACE: Deadline = deadline('proximity:face', 10_000,
  'a markup case loads the face its subject asks for from the local static server before it is measured');

export type Order = 'components-first' | 'vocabulary-first';
export const ORDERS: Order[] = ['components-first', 'vocabulary-first'];

export function partClasses(manifests: Iterable<ComponentManifest>) {
  const out = new Map<string, string>();
  for (const manifest of manifests) {
    const parts = classesManifest(manifest).parts ?? {};
    const classes = arenaClassesFor(manifest);
    for (const [slot, part] of Object.entries(parts)) if (!out.has(part) && classes[slot]) out.set(part, classes[slot]!);
  }
  return out;
}

export function partData(manifests: Iterable<ComponentManifest>) {
  const out = new Map<string, PartData>();
  for (const manifest of manifests) {
    const parts = classesManifest(manifest).parts ?? {};
    const data = arenaSlotDataFor(manifest);
    for (const [slot, part] of Object.entries(parts)) if (!out.has(part) && data[slot]) out.set(part, data[slot]!);
  }
  return out;
}

export function pageHtml(order: Order, body: string, witnessCss: string, sheets: { components: string[]; vocabulary: string[] }, root?: string) {
  const link = (href: string) => `<link rel="stylesheet" href="${href}">`;
  const components = ['frameworks/tailwind/consume/Preflight.generated.css', 'frameworks/tailwind/consume/Prelude.generated.css', ...sheets.components].map(link);
  const vocabulary = [...sheets.vocabulary.map(link), `<style>${witnessCss}</style>`];
  const head = [link('intro/styles.css'), ...(order === 'components-first' ? [...components, ...vocabulary] : [...vocabulary, ...components])];
  return `<!doctype html><html${root ? ` class="${root}"` : ''}><head><meta charset="utf-8">${head.join('')}</head><body>${body}</body></html>`;
}

export function markupVerdict(kase: MarkupCase, order: Order, measured: Record<string, string>): string | null {
  const where = `${kase.name} (${order})`;
  if ('equal' in kase) {
    for (const [a, b] of Object.entries(kase.equal)) {
      if (measured[a] !== measured[b]) return `${where}: ${a} is "${measured[a]}" and ${b} is "${measured[b]}", and the case expects them equal`;
    }
    return null;
  }
  if (Object.values(kase.expect).some((want) => want === null)) return `${where}: unrecorded, measured ${JSON.stringify(measured)}`;
  for (const [p, want] of Object.entries(kase.expect)) {
    if (measured[p] !== want) return `${where}: ${p} is "${measured[p]}" and the case expects "${want}"`;
  }
  return null;
}

const MEASURE_MARKUP = (properties: string[]) => `(() => {
  const subject = document.querySelector('[${SUBJECT}]');
  if (!subject) return null;
  const style = getComputedStyle(subject);
  return Object.fromEntries(${JSON.stringify(properties)}.map((p) => [p, style.getPropertyValue(p).trim()]));
})()`;

export type Measured = { width: number; container: number; property: string };

export function verdict(kase: ProximityCase, layer: string, order: Order, measured: Measured) {
  const where = `${kase.name} (${layer}, ${order})`;
  if ('property' in kase.measure) {
    return measured.property === kase.measure.value ? null
      : `${where}: ${kase.measure.property} is "${measured.property}" on the subject and the case expects "${kase.measure.value}"`;
  }
  if (kase.measure.width === 'container') {
    return Math.abs(measured.width - measured.container) < 0.5 ? null
      : `${where}: the subject is ${measured.width}px wide and the case expects the container's ${measured.container}px`;
  }
  return measured.width < measured.container - 1 ? null
    : `${where}: the subject is ${measured.width}px wide, the container's width, and the case expects its own width`;
}

const MEASURE = (property: string) => `(() => {
  const subject = document.querySelector('[${SUBJECT}]');
  const container = document.body.firstElementChild;
  if (!subject || !container) return null;
  return { width: subject.getBoundingClientRect().width, container: container.getBoundingClientRect().width,
    property: getComputedStyle(subject).getPropertyValue(${JSON.stringify(property)}).trim() };
})()`;

const FACE_EXPRESSION = `(async () => {
  const subject = document.querySelector('[${SUBJECT}]');
  if (subject) {
    const style = getComputedStyle(subject);
    await document.fonts.load(style.fontStyle + ' ' + style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily, '0');
  }
  await document.fonts.ready;
  return true;
})()`;

const WRITE_PAGE = (html: string) => `(() => { document.open(); document.write(${JSON.stringify(html)}); document.close(); return true; })()`;

const LOADED_EXPRESSION = `new Promise((resolve) => {
  const until = Date.now() + ${LOADED.ms};
  const tick = () => {
    const links = [...document.querySelectorAll('link[rel=stylesheet]')];
    if (document.body && document.readyState === 'complete' && links.every((one) => one.sheet)) resolve(true);
    else if (Date.now() >= until) resolve(false);
    else setTimeout(tick, ${POLL_MS});
  };
  tick();
})`;

function witnessManifests(family: WitnessFamily): ComponentManifest[] {
  const channel = declarations(Object.values(family.variants)[0] ?? '')[0]?.[0] ?? `--arena-${family.family}`;
  return (family.parts ?? ['button']).map((part) => ({
    component: `Arena${pascal(part)}`, answers: [family.family], slots: { root: `x-[var(${channel},0)]` },
  }));
}

async function main() {
  const { families, cases, markup } = readProximity();
  const unrecorded = cases.flatMap((one) => (['react', 'angular'] as const).filter((layer) => one[layer] === null).map((layer) => `${one.name} (${layer})`));
  if (cases.length === 0 || unrecorded.length) {
    console.error(`check-proximity: ${cases.length === 0 ? 'the fixture declares no case' : `no recorded tree for ${unrecorded.join(', ')}`}; `
      + 'run the layer suites, which print the tree each renders, and record it');
    process.exit(1);
  }
  const classes = partClasses(readManifests(root).values());
  const data = partData(readManifests(root).values());
  const sheet = (dir: string) => walkFiles(join(root, dir)).filter((p) => p.endsWith('.css')).map((p) => relPosix(root, p)).sort();
  const sheets = { components: sheet('frameworks/tailwind/consume/components'), vocabulary: sheet(VOCABULARY_SHEETS) };
  if (sheets.vocabulary.length === 0) { console.error('check-proximity: found 0 vocabulary sheets; run bun run build'); process.exit(1); }
  const witnessCss = families.map((family) => compileFamily(family, witnessManifests(family))).join('\n');
  const exe = browserOrExit('check-proximity');
  const server = await startStaticServer(root);
  const chrome = await launchChromium(exe);
  const cdp = await connect(chrome.wsUrl);
  const problems: string[] = [];
  let measured = 0;
  try {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Emulation.setDeviceMetricsOverride', VIEWPORT, sessionId);
    const origin = `http://127.0.0.1:${server.port}/package.json`;
    const settled = loadFired(cdp, sessionId);
    await withTimeout(cdp.send('Page.navigate', { url: origin }, sessionId), NAVIGATE.ms,
      `${origin}: navigate timed out after ${NAVIGATE.ms}ms, which is that size because ${NAVIGATE.why}`);
    await withTimeout(settled, NAVIGATE.ms,
      `${origin}: the load event never fired, within ${NAVIGATE.ms}ms, which is that size because ${NAVIGATE.why}`);
    const landed = await evaluate(cdp, 'location.href', sessionId);
    if (landed !== origin) throw new Error(`check-proximity: the page is at ${landed} and not ${origin}, so a case would be written onto the wrong origin`);
    const base = `<base href="http://127.0.0.1:${server.port}/">`;
    for (const kase of cases) {
      for (const layer of ['react', 'angular'] as const) {
        const tree = kase[layer]!;
        const body = treeHtml(tree, (part) => classes.get(part) ?? '', (part) => data.get(part) ?? {})
          .replace(/^<div/, `<div style="width: ${CONTAINER_WIDTH}px; display: flex; flex-direction: column; align-items: flex-start"`);
        for (const order of ORDERS) {
          const html = pageHtml(order, body, witnessCss, sheets).replace('<head>', `<head>${base}`);
          await evaluate(cdp, WRITE_PAGE(html), sessionId);
          const loaded = await withTimeout(evaluate(cdp, LOADED_EXPRESSION, sessionId), LOADED.ms + LOADED_MARGIN.ms,
            `${kase.name}: the page never finished loading its sheets, within ${LOADED.ms}ms, which is that size because ${LOADED.why}`);
          if (!loaded) { problems.push(`${kase.name} (${layer}, ${order}): a stylesheet never loaded, so nothing was measured`); continue; }
          const property = 'property' in kase.measure ? kase.measure.property : '--arena-fill-width';
          const result = await evaluate(cdp, MEASURE(property), sessionId) as Measured | null;
          if (!result) { problems.push(`${kase.name} (${layer}, ${order}): the tree carries no subject`); continue; }
          measured += 1;
          const problem = verdict(kase, layer, order, result);
          if (problem) problems.push(problem);
        }
      }
    }
    for (const kase of markup) {
      const properties = 'equal' in kase ? Object.entries(kase.equal).flat() : Object.keys(kase.expect);
      const body = `<div style="width: ${CONTAINER_WIDTH}px; font-family: var(--font-body)">${kase.html}</div>`;
      for (const order of ORDERS) {
        const html = pageHtml(order, body, witnessCss, { components: sheets.components, vocabulary: sheets.vocabulary }, kase.root)
          .replace('<head>', `<head>${base}`);
        await evaluate(cdp, WRITE_PAGE(html), sessionId);
        const loaded = await withTimeout(evaluate(cdp, LOADED_EXPRESSION, sessionId), LOADED.ms + LOADED_MARGIN.ms,
          `${kase.name}: the page never finished loading its sheets, within ${LOADED.ms}ms, which is that size because ${LOADED.why}`);
        if (!loaded) { problems.push(`${kase.name} (${order}): a stylesheet never loaded, so nothing was measured`); continue; }
        await withTimeout(evaluate(cdp, FACE_EXPRESSION, sessionId), FACE.ms,
          `${kase.name} (${order}): the subject's face never loaded, within ${FACE.ms}ms, which is that size because ${FACE.why}`);
        const result = await evaluate(cdp, MEASURE_MARKUP(properties), sessionId) as Record<string, string> | null;
        if (!result) { problems.push(`${kase.name} (${order}): the markup carries no subject`); continue; }
        measured += 1;
        const problem = markupVerdict(kase, order, result);
        if (problem) problems.push(problem);
      }
    }
  } finally {
    await chrome.kill?.();
    server.close?.();
  }
  if (problems.length) {
    console.error(`check-proximity: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-proximity: ${measured} measurement(s) across ${cases.length} case(s), both layers and both load orders, each as the case expects`);
}

if (isMainModule(import.meta.url)) await main();
