/* Loads every @dsCard page at its declared width and fails when content over-runs the box,
 * because the card is cropped to it and the overflow is lost silently.
 * The content height takes the MAX of two metrics and neither alone is the content bottom:
 * the descendant scan sees an absolutely-positioned overlay but never a trailing collapsed
 * margin, and body's border-box bottom sees that margin -- it lands inside body's box only
 * because the harness gives body bottom padding -- but never the out-of-flow overlay.
 * Removing either term reopens one case silently, since the gate only fails on clip. * A DsCard is what a page's first line declares, and a Measured is what the browser
 * answered about it. */
import { readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { interleaveForDispatch, mapWithConcurrency } from '../../utils/concurrency.ts';
import { withTimeout } from '../../utils/with-timeout.ts';
import { toPosix } from '../../utils/posix-path.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { startStaticServer } from '../../lib/arena/static-server.ts';
import { browserOrExit, launchChromium } from '../../lib/arena/chromium.ts';
import { connect } from '../../lib/arena/cdp.ts';
import type { CdpSend } from '../../lib/arena/cdp.ts';

type DsCard = { group: string; name: string; width: number; height: number };

type Measured = {
  rendered: boolean;
  timedOut?: boolean;
  [metric: string]: any;
};
import { cannotRun } from '../../lib/arena/arena-scripts-vars.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

export const node = {
  name: 'check:cards',
  reads: [
    'frameworks/tailwind/components/**', 'frameworks/tailwind/consume/**',
    'frameworks/react/components/**', 'frameworks/angular/components/**',
    'assets/fonts/*.woff2',
  ],
  writes: [],
  feeds: [],
};


const FRAME_FALLBACK_MS = 34;
export const MEASURE_SCRIPT = `(async () => {
  const read = () => {
    const de = document.documentElement;
    const style = getComputedStyle(document.body);
    const descendantBottoms = [...document.body.getElementsByTagName('*')].map((el) => el.getBoundingClientRect().bottom + window.scrollY);
    const bodyPaddingBottom = parseFloat(style.paddingBottom) || 0;
    const lowestDescendantIncludingOutOfFlow = Math.max(0, ...descendantBottoms) + bodyPaddingBottom;
    const bodyBorderBoxBottomIncludingCollapsedMargin = document.body.getBoundingClientRect().bottom + window.scrollY;
    const root = document.querySelector('#root');
    return {
      scrollWidth: de.scrollWidth,
      scrollHeight: de.scrollHeight,
      clientWidth: de.clientWidth,
      clientHeight: de.clientHeight,
      contentHeight: Math.ceil(Math.max(bodyBorderBoxBottomIncludingCollapsedMargin, lowestDescendantIncludingOutOfFlow)),
      rendered: !root || root.childElementCount > 0,
    };
  };

  const deadline = Date.now() + 20000;
  const readiness = (async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    if (window.arenaReady) await window.arenaReady();
  })();
  readiness.catch(() => {}); // seen as handled even if it loses the race below
  await Promise.race([readiness, new Promise((r) => setTimeout(r, Math.max(0, deadline - Date.now())))]);

  const nextFrame = () => new Promise((resolve) => {
    let settled = false;
    const finish = () => { if (!settled) { settled = true; resolve(); } };
    requestAnimationFrame(finish);
    setTimeout(finish, ${FRAME_FALLBACK_MS});
  });
  const fontsSettled = () => !document.fonts || document.fonts.status === 'loaded';

  let previous = null;
  let stable = 0;
  while (Date.now() < deadline) {
    const now = read();
    const key = JSON.stringify(now);
    stable = key === previous ? stable + 1 : 0;
    previous = key;
    if (stable >= 2 && now.rendered && fontsSettled()) return { ...now, timedOut: false };
    await nextFrame();
  }
  return { ...read(), timedOut: true };
})()`;

const NAVIGATE_TIMEOUT_MS = 10_000;

const EVALUATE_TIMEOUT_MS = 30_000;

function boundedSend(cdp: CdpSend, method: string, params: unknown, sessionId?: string): Promise<any> {
  return withTimeout(
    cdp.send(method, params, sessionId),
    NAVIGATE_TIMEOUT_MS,
    `${method} did not settle within ${NAVIGATE_TIMEOUT_MS}ms`,
  );
}

async function freezeAnimations(cdp: CdpSend, sessionId: string) {
  await boundedSend(cdp, 'Animation.enable', {}, sessionId);
  await boundedSend(cdp, 'Animation.setPlaybackRate', { playbackRate: 0 }, sessionId);
}

export async function measurePage(cdp: CdpSend, url: string, viewport: { width: number; height: number }) {
  const { targetId } = await boundedSend(cdp, 'Target.createTarget', { url: 'about:blank' });
  try {
    const { sessionId } = await boundedSend(cdp, 'Target.attachToTarget', { targetId, flatten: true });
    await boundedSend(cdp, 'Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: false,
    }, sessionId);
    await withTimeout(
      cdp.send('Page.navigate', { url }, sessionId),
      NAVIGATE_TIMEOUT_MS,
      `${url}: Page.navigate did not settle within ${NAVIGATE_TIMEOUT_MS}ms`,
    );

    await freezeAnimations(cdp, sessionId);
    const { result, exceptionDetails } = await withTimeout(
      cdp.send('Runtime.evaluate', {
        expression: MEASURE_SCRIPT,
        awaitPromise: true,
        returnByValue: true,
      }, sessionId),
      EVALUATE_TIMEOUT_MS,
      `${url}: Runtime.evaluate did not settle within ${EVALUATE_TIMEOUT_MS}ms`,
    );
    if (exceptionDetails) throw new Error(`${url}: ${exceptionDetails.text} ${exceptionDetails.exception?.description ?? ''}`);
    return result.value;
  } finally {

    try {
      await boundedSend(cdp, 'Target.closeTarget', { targetId });
    } catch {  }
  }
}

export const UNDER_RUN_SLACK = 120;

const SKIP_DIRS = new Set(['node_modules', '.git', '.claude-plugin', 'assets']);

export function parseDsCard(html: string): DsCard | null {
  const first = html.split('\n', 1)[0] ?? '';
  if (!first.includes('@dsCard')) return null;
  const attr = (name: string) => new RegExp(`${name}="([^"]*)"`).exec(first)?.[1];
  const viewport = attr('viewport');
  const size = viewport && /^(\d+)x(\d+)$/.exec(viewport.trim());
  if (!size) return null;
  return { group: attr('group') ?? '', name: attr('name') ?? '', width: Number(size[1]), height: Number(size[2]) };
}

export function findCardPages(root: string) {
  return walkFiles(root, { skip: (name) => name.startsWith('.') || SKIP_DIRS.has(name) })
    .filter((path) => path.endsWith('.html') && parseDsCard(readFileSync(path, 'utf8')))
    .map((path) => toPosix(relative(root, path)))
    .sort();
}

export function classify({ file, declared, measured }: {
  file: string; declared: Pick<DsCard, 'width' | 'height'>; measured: Measured;
}) {
  if (!measured.rendered) {
    return {
      file,
      status: 'unrendered',
      message: `${file} did not render — #root is empty after 20s. Check that frameworks/react/vendor/*.js is in sync (bun run check:vendor) and that node_modules is installed.`,
    };
  }

  if (measured.timedOut) {
    return {
      file,
      status: 'unrendered',
      message: `${file} never stabilized — its measurement kept changing on every read for the full 20s deadline, so nothing here can be trusted as the page at rest.`,
    };
  }

  const width = Math.max(measured.scrollWidth, measured.clientWidth);
  const height = Math.max(measured.scrollHeight, measured.clientHeight);
  if (width > declared.width || height > declared.height) {
    const over = [
      width > declared.width ? `${width - declared.width}px wider` : null,
      height > declared.height ? `${height - declared.height}px taller` : null,
    ].filter(Boolean).join(' and ');
    return {
      file,
      status: 'clip',
      message: `${file} declares ${declared.width}x${declared.height} but renders ${width}x${height} — ${over}. The card is cropped to the declared box, so that content is lost. Declare ${width}x${height}.`,
    };
  }

  const short = declared.height - measured.contentHeight;
  if (short > UNDER_RUN_SLACK) {
    return {
      file,
      status: 'under',
      message: `${file} declares ${declared.width}x${declared.height} but its content ends ${short}px above the fold — the card renders mostly empty. Nothing is lost; consider ${declared.width}x${measured.contentHeight}.`,
    };
  }

  return { file, status: 'ok', message: '' };
}

export function summarizeCards(results: { file: string; status: string; message?: string }[]) {
  const of = (status: string) => results.filter((r) => r.status === status);
  const clips = of('clip');
  const unders = of('under');
  const unrendered = of('unrendered');

  const lines = [];
  if (clips.length) {
    lines.push(`check-card-viewports: ${clips.length} page(s) render past their declared box\n`);
    for (const r of clips) lines.push(`  ${r.message}`);
  }
  if (unrendered.length) {
    lines.push(`\ncheck-card-viewports: ${unrendered.length} page(s) could not be measured\n`);
    for (const r of unrendered) lines.push(`  ${r.message}`);
  }
  if (unders.length) {
    lines.push(`\ncheck-card-viewports: ${unders.length} warning(s) — over-tall declarations, nothing is lost\n`);
    for (const r of unders) lines.push(`  ${r.message}`);
  }
  if (!clips.length && !unrendered.length) {

    lines.push(unders.length
      ? `check-card-viewports: ${results.length} page(s) measured, none render past its declared box — ${unders.length} warning(s) above`
      : `check-card-viewports: ${results.length} page(s) measured, every one fits its declared viewport`);
  }

  return { text: lines.join('\n'), failed: clips.length, warned: unders.length, unrendered: unrendered.length };
}

export async function measureCardPage(cdp: CdpSend, file: string, pageRoot: string, port: number) {
  const declared = parseDsCard(readFileSync(join(pageRoot, file), 'utf8'));
  if (!declared) {
    return { file, status: 'undeclared', message: `${file} carries no @dsCard, so nothing states what it should measure` };
  }
  const url = `http://127.0.0.1:${port}/${file.split('/').map(encodeURIComponent).join('/')}`;
  try {
    const measured = await measurePage(cdp, url, { width: declared.width, height: declared.height });
    return classify({ file, declared, measured });
  } catch (err) {
    return {
      file,
      status: 'unrendered',
      message: `${file} could not be measured — ${(err as Error).message}`,
    };
  }
}

const skip: (reason: string) => never = (reason) => cannotRun('check-card-viewports', reason);

const PAGE_CONCURRENCY = 1;

async function main() {
  const exe = browserOrExit('check-card-viewports');

  const pages = findCardPages(root);
  const server = await startStaticServer(root);
  let chrome: Awaited<ReturnType<typeof launchChromium>> | undefined;
  let cdp: Awaited<ReturnType<typeof connect>> | undefined;
  try {
    chrome = await launchChromium(exe);
    cdp = await connect(chrome.wsUrl);
  } catch (err) {
    await server.close();
    await chrome?.kill();
    skip(`${exe} could not be driven: ${(err as Error).message}`);
  }

  let results;
  try {
    const dispatchOrder = interleaveForDispatch(pages, PAGE_CONCURRENCY);
    const byFile = new Map();
    await mapWithConcurrency(dispatchOrder, PAGE_CONCURRENCY, async (file: string) => {
      byFile.set(file, await measureCardPage(cdp, file, root, server.port));
    });
    results = pages.map((file) => byFile.get(file));
  } finally {
    cdp.close();
    await chrome.kill();
    await server.close();
  }

  const summary = summarizeCards(results);

  if (summary.failed) {
    console.error(summary.text);
    process.exit(1);
  }
  console.log(summary.text);
  if (summary.unrendered) skip(`${summary.unrendered} page(s) never rendered — see above`);
}

if (isMainModule(import.meta.url)) main();
