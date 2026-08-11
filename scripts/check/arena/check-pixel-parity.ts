/* Captures the kitchen-sink page every layer draws for one design extension and fails on one
 * differing pixel. Every other cross-layer gate makes a claim about text, and the render suites
 * go through happy-dom, which has no layout: a geometry, an inherited typography or a computed
 * colour that moved in one layer alone passes all of them. No baseline and no tolerance, because
 * the question is whether the layers agree with EACH OTHER and one browser renders both pages,
 * so a threshold would license exactly the move this catches. Motion is removed and focus
 * dropped before the shutter: reduced motion SLOWS a spinner by design rather than stopping it,
 * and focus is one global every open overlay claims in mount order. A page is captured until two
 * in a row agree, since a chart redraws from a measurement that arrives after the layout that
 * provoked it. Pairs are walked from the tree, and a sweep finding none fails. */

import { readdirSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { withTimeout } from '../../utils/with-timeout.ts';
import { deadline, type Deadline } from '../../lib/arena/deadline.ts';
import { POLL_MS } from '../../lib/arena/wait-for.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { startStaticServer } from '../../lib/arena/static-server.ts';
import { browserOrExit, launchChromium } from '../../lib/arena/chromium.ts';
import { connect } from '../../lib/arena/cdp.ts';
import type { Cdp } from '../../lib/arena/cdp.ts';
import { arenaEnv, cannotRun } from '../../lib/arena/arena-scripts-vars.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { COLLECT, REPORT, silenceOf, type Silence } from '../../lib/arena/page-errors.ts';
import { READY, PAGE_FILE } from '../../lib/arena/kitchen-sink-page.ts';
import { SINK_LAYERS } from '../../generate/arena/generate-kitchen-sink.ts';
import { decode, difference, CHANNEL_NAMES } from '../../lib/arena/png.ts';

export const node = {
  name: 'check:pixel-parity',
  reads: [
    'frameworks/react/kitchen-sink/**', 'frameworks/angular/kitchen-sink/**',
    'frameworks/react/components/**/*.generated.js', 'frameworks/react/playground/*.generated.js',
    'frameworks/tailwind/consume/**', 'frameworks/react/vendor/**',
    'frameworks/angular/build/demo/**', 'contracts/design-generated/**',
    'intro/kitchen-sink.css', 'intro/styles.css', 'intro/toggle.css', 'intro/theme.js',
  ],
  writes: [],
  feeds: [],
};

export const THEMES = ['dark', 'light'];

export const VIEWPORT = { width: 1440, height: 1200, deviceScaleFactor: 1, mobile: false };

export const NAVIGATE: Deadline = deadline('pixel-parity:navigate', 30_000,
  'a kitchen-sink page fetches the whole component barrel and its layer\'s bundle, so the first '
  + 'navigation of a sweep pays for a cold HTTP cache and for whatever the static server is still writing');

export const PAINTED: Deadline = deadline('pixel-parity:painted', 40_000,
  'the page mounts every component the library ships and only says it is ready once the webfonts '
  + 'have resolved and two frames have passed, which on a runner with no GPU is the slowest thing '
  + 'either layer does');

export const CAPTURE: Deadline = deadline('pixel-parity:capture', 30_000,
  'a full-page screenshot of a document taller than the viewport is composited tile by tile, and '
  + 'the whole library on one page is several viewports tall');

export const SETTLED: Deadline = deadline('pixel-parity:settled', 120_000,
  'a page is captured until two captures in a row come back identical, and each capture of the '
  + 'whole library is composited tile by tile, so this holds several of them plus whatever the '
  + 'charts spend re-measuring their plot boxes after the first layout');

export const SETTLE_TRIES = 12;

export const STILL = `(() => {
  const style = document.createElement('style');
  style.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; caret-color: transparent !important; }'
    + ' *:focus, *:focus-visible { outline: none !important; box-shadow: none !important; }';
  document.head.append(style);
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  return true;
})()`;

export function stableHeightExpression(bound: Deadline) {
  return `new Promise((resolve) => {
    const until = Date.now() + ${bound.ms};
    let last = -1;
    let stable = 0;
    const tick = () => {
      const height = document.documentElement.scrollHeight;
      stable = height === last ? stable + 1 : 0;
      last = height;
      if (stable >= 3) resolve({ settled: true, height });
      else if (Date.now() >= until) resolve({ settled: false, height });
      else setTimeout(tick, ${POLL_MS});
    };
    tick();
  })`;
}

export function readyExpression(bound: Deadline) {
  return `new Promise((resolve) => {
    const until = Date.now() + ${bound.ms};
    const started = Date.now();
    const tick = () => {
      if (document.documentElement.hasAttribute(${JSON.stringify(READY)}))
        resolve({ ready: true, waitedMs: Date.now() - started });
      else if (Date.now() >= until) resolve({ ready: false, waitedMs: Date.now() - started });
      else setTimeout(tick, ${POLL_MS});
    };
    tick();
  })`;
}

export function sinkDir(layer: string) {
  return join(root, 'frameworks', layer, 'kitchen-sink');
}

export function voicesIn(layer: string) {
  const dir = sinkDir(layer);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(dir, entry.name, PAGE_FILE)))
    .map((entry) => entry.name)
    .sort();
}

export function pagePath(layer: string, extension: string) {
  return `frameworks/${layer}/kitchen-sink/${extension}/${PAGE_FILE}`;
}

export function pairProblems(byLayer: Map<string, string[]>) {
  const problems = [];
  const layers = [...byLayer.keys()];
  const union = [...new Set(layers.flatMap((layer) => byLayer.get(layer) ?? []))].sort();
  for (const extension of union) {
    const missing = layers.filter((layer) => !(byLayer.get(layer) ?? []).includes(extension));
    if (missing.length === 0) continue;
    problems.push(`${extension}: ${missing.join(' and ')} draws no page for this voice, so there is `
      + 'no pair to compare and the voice ships compared in one layer only');
  }
  return problems;
}

export function sizeProblem(name: string, a: { width: number; height: number },
  b: { width: number; height: number }) {
  if (a.width === b.width && a.height === b.height) return null;
  return `${name}: the two pages are not even the same size. react is ${a.width}x${a.height} and `
    + `angular is ${b.width}x${b.height}. A height that differs is content that reflowed or a `
    + 'component that rendered in one layer and not the other, which is a bigger finding than any '
    + 'box below could describe';
}

export function differenceProblem(name: string, png: { react: Buffer; angular: Buffer }) {
  const a = decode(png.react);
  const b = decode(png.angular);
  const size = sizeProblem(name, a, b);
  const diff = difference(a, b);
  if (!diff) {
    return size ?? `${name}: the two files differ as bytes and every pixel they share is equal, `
      + 'which means the difference is in the encoding rather than the image; the capture options moved';
  }
  const { pixels, box, maxDelta, channel } = diff;
  const where = `x=${box.left}..${box.right} y=${box.top}..${box.bottom}`;
  return `${name}: ${pixels} pixel(s) differ, inside ${where}, the largest by ${maxDelta} on the `
    + `${CHANNEL_NAMES[channel] ?? channel} channel${size ? `. ${size}` : ''}. Open both pages at that `
    + `scroll offset with bun run demos, or set ARENA_PIXEL_DUMP to a directory to have this run `
    + 'write the two captures out';
}

export function dumpDir(env = arenaEnv()) {
  return env.ARENA_PIXEL_DUMP;
}

export function dump(dir: string, name: string, png: { react: Buffer; angular: Buffer }) {
  mkdirSync(dir, { recursive: true });
  const written = [];
  for (const [layer, bytes] of Object.entries(png)) {
    const path = join(dir, `${name}.${layer}.png`);
    writeFileSync(path, bytes);
    written.push(path);
  }
  return written;
}

export function loaded(cdp: Cdp, sessionId: string) {
  return new Promise<void>((resolve) => {
    cdp.on((message) => {
      if (message.method === 'Page.loadEventFired'
        && (message as { sessionId?: string }).sessionId === sessionId) resolve();
    });
  });
}

async function capture(cdp: Cdp, url: string) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  try {
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
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

    const ev = (expression: string) => cdp.send('Runtime.evaluate',
      { expression, awaitPromise: true, returnByValue: true }, sessionId);

    const painted = (await ev(readyExpression(PAINTED))).result.value;
    const silence: Silence = (await ev(REPORT)).result.value;
    if (!painted.ready) return { png: null, settled: false, tries: 0, painted, silence };

    await ev(STILL);
    await ev(stableHeightExpression(PAINTED));

    const once = async () => {
      const shot = await withTimeout(
        cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId),
        CAPTURE.ms,
        `${url}: capture timed out after ${CAPTURE.ms}ms, which is that size because ${CAPTURE.why}`,
      );
      return Buffer.from(shot.data, 'base64');
    };

    await once();

    const until = Date.now() + SETTLED.ms;
    let previous = await once();
    for (let tries = 1; tries <= SETTLE_TRIES; tries += 1) {
      const next = await once();
      if (next.equals(previous)) return { png: next, settled: true, tries, painted, silence };
      previous = next;
      if (Date.now() >= until) break;
    }
    return { png: previous, settled: false, tries: SETTLE_TRIES, painted, silence };
  } finally {
    try { await cdp.send('Target.closeTarget', { targetId }); } catch { void 0; }
  }
}

export function paintProblem(name: string, layer: string,
  shot: { painted: { ready: boolean; waitedMs: number }; settled: boolean; tries: number; silence: Silence }) {
  if (shot.painted.ready && !shot.settled) {
    return `${name}: the ${layer} page never stopped changing. ${SETTLE_TRIES} captures in a row `
      + 'each differed from the one before it, so nothing here can be compared against the other '
      + 'layer: the difference between two runs of this page is already larger than the difference '
      + 'this gate looks for. Something on it animates through a reduced-motion emulation, or '
      + 'redraws from a measurement that never converges';
  }
  if (!shot.painted.ready) {
    return `${name}: the ${layer} page never signalled that it had painted, within ${PAINTED.ms}ms, `
      + `which is that size because ${PAINTED.why}. The wait ended after ${shot.painted.waitedMs}ms, `
      + `so this says nothing about whether the two layers agree${silenceOf(shot.silence)}`;
  }
  if (shot.silence.errors.length > 0) {
    return `${name}: the ${layer} page raised ${shot.silence.errors.length} error(s) while loading, so `
      + `what it painted is not what it was asked to paint${silenceOf(shot.silence)}`;
  }
  return null;
}

const skip: (reason: string) => never = (reason) => cannotRun('check-pixel-parity', reason);

async function main() {
  const byLayer = new Map(SINK_LAYERS.map((layer) => [layer, voicesIn(layer)]));
  const shared = pairProblems(byLayer);
  const voices = (byLayer.get('react') ?? []).filter((one) => (byLayer.get('angular') ?? []).includes(one));

  if (voices.length === 0) {
    console.error('check-pixel-parity: found 0 kitchen-sink pair(s). An empty sweep is a failure '
      + 'rather than a clean pass: run bun run build, which emits the pages and bundles both layers.');
    process.exit(1);
  }
  const exe = browserOrExit('check-pixel-parity');
  const into = dumpDir();

  const server = await startStaticServer(root);
  const chrome = await launchChromium(exe);
  const cdp = await connect(chrome.wsUrl);
  const problems = [...shared];
  const dumped = [];
  let compared = 0;
  let slowest = 0;
  try {
    for (const extension of voices) {
      for (const theme of THEMES) {
        const name = `${extension}:${theme}`;
        const url = (layer: string) =>
          `http://127.0.0.1:${server.port}/${pagePath(layer, extension)}?theme=${theme}`;
        const react = await capture(cdp, url('react'));
        const angular = await capture(cdp, url('angular'));
        slowest = Math.max(slowest, react.painted.waitedMs, angular.painted.waitedMs);

        const unpainted = [paintProblem(name, 'react', react), paintProblem(name, 'angular', angular)]
          .filter((one): one is string => one !== null);
        if (unpainted.length > 0) { problems.push(...unpainted); continue; }
        if (!react.png || !angular.png) continue;

        compared += 1;
        if (react.png.equals(angular.png)) continue;
        problems.push(differenceProblem(name, { react: react.png, angular: angular.png }));
        if (into) dumped.push(...dump(into, name, { react: react.png, angular: angular.png }));
      }
    }
  } finally {
    await chrome.kill?.();
    server.close?.();
  }

  if (problems.length) {
    console.error(`check-pixel-parity: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}\n`);
    if (dumped.length) {
      console.error(`  captures written:\n${dumped.map((p) => `    ${p}`).join('\n')}`);
    }
    process.exit(1);
  }
  console.log(`check-pixel-parity: ${compared} pair(s) captured in a real browser across `
    + `${voices.length} voice(s) and ${THEMES.length} theme(s), and every one of them is identical `
    + `byte for byte. The slowest page painted after ${slowest}ms of the ${PAINTED.ms}ms allowed`);
}

if (isMainModule(import.meta.url)) {
  if (SINK_LAYERS.length < 2) skip('a comparison needs two layers, and the emitter names fewer');
  await main();
}
