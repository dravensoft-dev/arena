/* The hero's line is drawn at the default style plugin's own steps in a real browser, because only
 * layout can say whether a word fits: the line reaches step-title-hero on a wide page and narrows
 * toward step-title-page on a phone. The sentence carries an eleven-letter word which, at 64px in the
 * heading face, is wider than a 320px screen leaves a hero once its gutters are paid, so a line
 * drawn at the wide step runs off the edge of the phone a landing page opens on. A skip is DECLARED and never called. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findChromium, launchChromium, DEVTOOLS, GRACE, REAP } from '../../lib/arena/chromium.ts';
import { connect, evaluate } from '../../lib/arena/cdp.ts';
import { budgetFor, deadline, type Deadline } from '../../lib/arena/deadline.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { withTimeout } from '../../utils/with-timeout.ts';

const LOAD: Deadline = deadline('hero-title:load', 30_000,
  'a cold browser reads the token stylesheets and decodes the heading face from disk before the '
  + 'line it measures has its real width, and a line measured in a fallback family answers nothing');

const BROWSER = findChromium();

const NEEDS_A_BROWSER = BROWSER.path ? false : `no Chromium available to measure in: ${BROWSER.reason}`;

const SHEETS = [
  'contracts/design-generated/fonts.generated.css',
  'contracts/design-generated/typography.generated.css',
  'contracts/design-generated/spacing.generated.css',
  'contracts/design-generated/palette.generated.css',
  'contracts/design-generated/style-plugin.default.generated.css',
  'contracts/design/environment.css',
  'frameworks/tailwind/consume/Preflight.generated.css',
  'frameworks/tailwind/consume/components/layout/arena-hero/ArenaHero.styles.generated.css',
];

const LINE = 'Software that shows up on search and earns confidence.';

const GUTTER = 22;

const PHONES = [320, 330, 340];

const WIDE = [1280, 1600];

function page() {
  const links = SHEETS.map((sheet) => `<link rel="stylesheet" href="${pathToFileURL(join(repoRoot, sheet)).href}">`);
  return `<!doctype html><html><head><meta charset="utf-8">${links.join('')}</head>`
    + `<body style="margin:0"><main style="padding-inline:${GUTTER}px">`
    + '<section class="arena-hero__root"><div class="arena-hero__words">'
    + `<h1 class="arena-hero__title">${LINE}</h1></div></section></main></body></html>`;
}

const MEASURE = `document.fonts.ready.then(() => {
  const title = document.querySelector('.arena-hero__title');
  const root = getComputedStyle(document.documentElement);
  const words = document.createRange();
  words.selectNodeContents(title);
  const right = Math.max(...[...words.getClientRects()].map((r) => r.right));
  return {
    size: parseFloat(getComputedStyle(title).fontSize),
    page: parseFloat(root.getPropertyValue('--step-title-page')),
    hero: parseFloat(root.getPropertyValue('--step-title-hero')),
    overflow: right - (innerWidth - ${GUTTER}),
  };
})`;

type Drawn = { width: number; size: number; page: number; hero: number; overflow: number };

async function drawAt(widths: number[]): Promise<Drawn[]> {
  const dir = mkdtempSync(join(tmpdir(), 'arena-hero-title-'));
  const file = join(dir, 'hero.html');
  writeFileSync(file, page());
  const chrome = await launchChromium(BROWSER.path ?? '');
  const cdp = await connect(chrome.wsUrl);
  try {
    const drawn: Drawn[] = [];
    for (const width of widths) {
      const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
      await cdp.send('Emulation.setDeviceMetricsOverride', { width, height: 800, deviceScaleFactor: 1, mobile: false }, sessionId);
      await cdp.send('Page.enable', {}, sessionId);
      const loaded = new Promise<void>((resolve) => {
        cdp.on((message) => {
          if (message.method === 'Page.loadEventFired' && (message as { sessionId?: string }).sessionId === sessionId) resolve();
        });
      });
      await cdp.send('Page.navigate', { url: pathToFileURL(file).href }, sessionId);
      await withTimeout(loaded, LOAD.ms, `the page never loaded within ${LOAD.ms}ms, which is that size because ${LOAD.why}`);
      const measured = await withTimeout(evaluate(cdp, MEASURE, sessionId), LOAD.ms,
        `the fonts never became ready within ${LOAD.ms}ms, which is that size because ${LOAD.why}`);
      drawn.push({ width, ...measured });
      await cdp.send('Target.closeTarget', { targetId });
    }
    return drawn;
  } finally {
    await chrome.kill();
    rmSync(dir, { recursive: true, force: true });
  }
}

const BUDGET_MS = budgetFor(DEVTOOLS, GRACE, REAP, LOAD, LOAD, LOAD, LOAD, LOAD, LOAD);

test('on a phone the hero line narrows toward the page step and no word runs off the screen',
  { timeout: BUDGET_MS, skip: NEEDS_A_BROWSER }, async () => {
  for (const { width, ...drawn } of await drawAt(PHONES)) {
    assert.ok(drawn.size < drawn.hero, `at ${width}px the line is ${drawn.size}px, the step a wide page takes`);
    assert.ok(drawn.size >= drawn.page, `at ${width}px the line is ${drawn.size}px, below the page step of ${drawn.page}px`);
    assert.ok(drawn.overflow <= 0.5,
      `at ${width}px a word of the hero line runs ${drawn.overflow.toFixed(1)}px past the gutter, off the edge of the phone`);
  }
});

test('from 1280px the hero line is drawn at step-title-hero, untouched',
  { timeout: BUDGET_MS, skip: NEEDS_A_BROWSER }, async () => {
  for (const { width, ...drawn } of await drawAt(WIDE)) {
    assert.equal(drawn.size, drawn.hero, `at ${width}px the line is ${drawn.size}px and the plugin says ${drawn.hero}px`);
    assert.equal(drawn.size, 64, 'the default style plugin draws its hero line at fs.display');
  }
});
