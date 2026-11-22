/* Arena's three entrances are drawn in Chromium against the tree's intro/styles.css, because a
 * utility that reads a role the sheet never defines computes no duration and passes on nothing.
 * The animation utilities are the @utility blocks of Animations.css lifted into plain rules, and an
 * answer is a class rule the way a later plugin writes one. Each entrance is created and read in the same turn so its
 * animation has not finished, and a probe painted in the same scope gives the duration and curve the
 * role is expected to answer. A skip is DECLARED and never called. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findChromium, launchChromium, DEVTOOLS, GRACE, REAP } from '../../lib/arena/chromium.ts';
import { connect, evaluate } from '../../lib/arena/cdp.ts';
import { budgetFor, deadline, type Deadline } from '../../lib/arena/deadline.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { withTimeout } from '../../utils/with-timeout.ts';

const LOAD: Deadline = deadline('entrance-roles:load', 30_000,
  'a cold browser reads the palette sheet and its imports from disk before the roles it measures resolve');

const BROWSER = findChromium();
const NEEDS_A_BROWSER = BROWSER.path ? false : `no Chromium available to measure in: ${BROWSER.reason}`;
const SHEET = pathToFileURL(join(repoRoot, 'intro', 'styles.css')).href;
const ANIMATIONS = readFileSync(join(repoRoot, 'frameworks', 'tailwind', 'Animations.css'), 'utf8')
  .replace(/@utility ([\w-]+) \{/g, '.$1 {');
const LATER = '.arena-later';

type Row = {
  name: string;
  utility: 'arena-pop' | 'arena-menu' | 'arena-fade';
  answers: Record<string, string>;
  reduced: boolean;
  want: { duration: string; ease: string };
  travels: boolean;
};

const ENTRANCES: Row[] = [
  { name: 'the dialog panel with no answer takes the deep default', utility: 'arena-pop', answers: {}, reduced: false,
    want: { duration: '220ms', ease: '--ease-emphatic' }, travels: true },
  { name: 'the menu with no answer takes the floating default', utility: 'arena-menu', answers: {}, reduced: false,
    want: { duration: '120ms', ease: '--ease-out' }, travels: true },
  { name: 'the tooltip with no answer takes the floating default', utility: 'arena-fade', answers: {}, reduced: false,
    want: { duration: '120ms', ease: '--ease-out' }, travels: false },
  { name: 'an answer to the deep entrance moves the dialog', utility: 'arena-pop', answers: { '--dur-enter-deep': 'var(--dur-slow)' },
    reduced: false, want: { duration: '420ms', ease: '--ease-emphatic' }, travels: true },
  { name: 'an answer to the deep entrance leaves the menu', utility: 'arena-menu', answers: { '--dur-enter-deep': 'var(--dur-slow)' },
    reduced: false, want: { duration: '120ms', ease: '--ease-out' }, travels: true },
  { name: 'an answer to the deep entrance leaves the tooltip', utility: 'arena-fade', answers: { '--dur-enter-deep': 'var(--dur-slow)' },
    reduced: false, want: { duration: '120ms', ease: '--ease-out' }, travels: false },
  { name: 'an answer to the floating entrance moves the menu and leaves the dialog', utility: 'arena-menu',
    answers: { '--dur-enter-floating': 'var(--dur-slow)', '--ease-enter-floating': 'var(--ease-in-out)' },
    reduced: false, want: { duration: '420ms', ease: '--ease-in-out' }, travels: true },
  { name: 'the dialog keeps the answered duration and drops its travel under reduced motion', utility: 'arena-pop',
    answers: { '--dur-enter-deep': 'var(--dur-slow)' }, reduced: true,
    want: { duration: '420ms', ease: '--ease-emphatic' }, travels: false },
];

type Measured = { found: boolean; duration: string; ease: string; wantDuration: string; wantEase: string; transforms: string[] };

const MEASURE = (row: Row) => `(() => {
  const row = ${JSON.stringify(row)};
  const scope = document.createElement('div');
  scope.className = 'arena-later';
  document.body.append(scope);
  const el = document.createElement('div');
  el.className = row.utility;
  scope.append(el);
  const animations = el.getAnimations();
  const probe = document.createElement('i');
  probe.style.setProperty('animation-duration', row.want.duration);
  probe.style.setProperty('animation-timing-function', 'var(' + row.want.ease + ')');
  scope.append(probe);
  const style = getComputedStyle(el);
  return {
    found: animations.length === 1,
    duration: style.animationDuration,
    ease: style.animationTimingFunction,
    wantDuration: getComputedStyle(probe).animationDuration,
    wantEase: getComputedStyle(probe).animationTimingFunction,
    transforms: animations.flatMap((a) => a.effect.getKeyframes().map((k) => String(k.transform ?? 'none'))),
  };
})()`;

async function drawn(): Promise<{ row: Row; got: Measured }[]> {
  const dir = mkdtempSync(join(tmpdir(), 'arena-entrance-roles-'));
  const chrome = await launchChromium(BROWSER.path ?? '');
  const cdp = await connect(chrome.wsUrl);
  try {
    const file = join(dir, 'page.html');
    const later = (row: Row) => `${LATER} { ${Object.entries(row.answers).map(([prop, value]) => `${prop}: ${value};`).join(' ')} }`;
    writeFileSync(file, `<!doctype html><link rel="stylesheet" href="${SHEET}"><style>${ANIMATIONS}</style><style id="later"></style><body></body>`);
    const out: { row: Row; got: Measured }[] = [];
    for (const row of ENTRANCES) {
      const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
      await cdp.send('Page.enable', {}, sessionId);
      await cdp.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-motion', value: row.reduced ? 'reduce' : 'no-preference' }],
      }, sessionId);
      const loaded = new Promise<void>((resolve) => {
        cdp.on((message) => {
          if (message.method === 'Page.loadEventFired' && (message as { sessionId?: string }).sessionId === sessionId) resolve();
        });
      });
      await cdp.send('Page.navigate', { url: pathToFileURL(file).href }, sessionId);
      await withTimeout(loaded, LOAD.ms, `${row.name}: the page never loaded within ${LOAD.ms}ms, which is that size because ${LOAD.why}`);
      await evaluate(cdp, `document.getElementById('later').textContent = ${JSON.stringify(later(row))}`, sessionId);
      out.push({ row, got: await evaluate(cdp, MEASURE(row), sessionId) });
      await cdp.send('Target.closeTarget', { targetId });
    }
    return out;
  } finally {
    await chrome.kill();
    rmSync(dir, { recursive: true, force: true });
  }
}

const BUDGET_MS = budgetFor(DEVTOOLS, GRACE, REAP, LOAD) + ENTRANCES.length * 2_000;

test('an answer to the deep entrance moves the dialog and leaves the floating ones',
  { timeout: BUDGET_MS, skip: NEEDS_A_BROWSER }, async () => {
  const wrong = (await drawn()).flatMap(({ row, got }) => {
    if (!got.found) return [`${row.name}: no animation ran on the ${row.utility} element`];
    const travel = got.transforms.some((t) => t !== 'none');
    return [
      ...(got.duration === got.wantDuration ? [] : [`${row.name}: duration computes ${got.duration}, expected ${got.wantDuration}`]),
      ...(got.ease === got.wantEase ? [] : [`${row.name}: curve computes ${got.ease}, expected ${got.wantEase}`]),
      ...(travel === row.travels ? [] : [`${row.name}: keyframes ${row.travels ? 'carry no' : 'still carry a'} transform (${got.transforms.join(' | ')})`]),
    ];
  });
  assert.deepEqual(wrong, []);
});
