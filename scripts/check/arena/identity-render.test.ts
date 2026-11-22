/* Each identity page is drawn in Chromium against the tree's intro/styles.css, because a row that
 * never loads the palette sheet reads an invalid fill and passes on nothing. Every panel wears one
 * polarity class and must answer that polarity's roles, so each specimen is compared with a probe
 * painted inside the same panel. The hosted font imports are dropped from the copy that is drawn,
 * since a colour does not wait on a web font. A skip is DECLARED and never called. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findChromium, launchChromium, DEVTOOLS, GRACE, REAP } from '../../lib/arena/chromium.ts';
import { connect, evaluate } from '../../lib/arena/cdp.ts';
import { BUDGET_SLACK, budgetFor, deadline, type Deadline } from '../../lib/arena/deadline.ts';
import { IDENTITY_PAGES } from '../../lib/arena/agent-payload.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { withTimeout } from '../../utils/with-timeout.ts';

const LOAD: Deadline = deadline('identity-render:load', 30_000,
  'a cold browser reads the palette sheet and its imports from disk before the roles it measures resolve');

const BROWSER = findChromium();
const NEEDS_A_BROWSER = BROWSER.path ? false : `no Chromium available to measure in: ${BROWSER.reason}`;
const SHEET = pathToFileURL(join(repoRoot, 'intro', 'styles.css')).href;
const TRANSPARENT = /^rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\)$/;

type Pair = { got: string; want: string };
type Panel = {
  polarity: 'dark' | 'light';
  surface: Pair | null;
  primary: Pair | null;
  invalid: Pair[];
  fills: (Pair & { role: string })[];
  washes: string[];
};
type Measured = { page: string; panels: Panel[] };

const real = (colour: string) => colour !== '' && !TRANSPARENT.test(colour);

const POLARITIES = ['dark', 'light'] as const;

function compared(panels: Panel[], what: string, pick: (p: Panel) => Pair[]): string[] {
  return POLARITIES.flatMap((polarity) => {
    const held = panels.filter((p) => p.polarity === polarity).flatMap(pick);
    if (held.length === 0) return [`no ${polarity} panel holds ${what}`];
    return held.flatMap((one) => one.got === one.want && real(one.want) ? []
      : [`a ${polarity} ${what} computes ${one.got}, expected ${one.want}`]);
  });
}

const ROWS: { name: string; problems: (m: Measured) => string[] }[] = [
  { name: 'each polarity panel answers its own surface',
    problems: ({ panels }) => {
      const want = (polarity: string) => panels.find((p) => p.polarity === polarity && p.surface)?.surface?.want;
      return [...compared(panels, 'surface specimen', (p) => p.surface ? [p.surface] : []),
        ...(want('dark') !== undefined && want('dark') === want('light') ? [`both panels answer ${want('dark')}`] : [])];
    } },
  { name: "the preview's primary action reads the primary emphasis fill in both panels",
    problems: ({ panels }) => compared(panels, 'primary action', (p) => p.primary ? [p.primary] : []) },
  { name: 'the invalid field specimen reads the invalid edge',
    problems: ({ panels }) => compared(panels, 'invalid specimen', (p) => p.invalid) },
  { name: 'no specimen computes a transparent fill where it declares one',
    problems: ({ panels }) => [
      ...compared(panels, 'declared fill', (p) => p.fills),
      ...panels.flatMap((p) => p.washes.flatMap((got) => real(got) ? [] : [`a ${p.polarity} selected wash computes ${got}`])),
    ] },
];

const MEASURE = `(() => {
  const read = (el, prop) => getComputedStyle(el).getPropertyValue(prop);
  const probe = (panel, prop, value) => {
    const i = document.createElement('i');
    i.style.setProperty(prop, value);
    i.style.setProperty('border-top-style', 'solid');
    panel.append(i);
    const out = read(i, prop);
    i.remove();
    return out;
  };
  const pair = (panel, el, prop, role) => el === null ? null : { got: read(el, prop), want: probe(panel, prop, 'var(--' + role + ')') };
  return [...document.querySelectorAll('.panel')].map((panel) => ({
    polarity: panel.classList.contains('arena-dark') ? 'dark' : 'light',
    surface: pair(panel, panel.querySelector('[data-specimen="surface"]'), 'background-color', 'fill-surface'),
    primary: pair(panel, panel.querySelector('[data-specimen="primary"]'), 'background-color', 'emphasis-primary-fill'),
    invalid: [...panel.querySelectorAll('[data-specimen="invalid"], [data-state="invalid"]')]
      .map((el) => pair(panel, el, 'border-top-color', 'edge-invalid')),
    fills: [...panel.querySelectorAll('[data-fills]')]
      .map((el) => ({ role: el.dataset.fills, ...pair(panel, el, 'background-color', el.dataset.fills) })),
    washes: [...panel.querySelectorAll('[data-wash]')].map((el) => read(el, 'background-color')),
  }));
})()`;

async function drawn(): Promise<Measured[]> {
  const dir = mkdtempSync(join(tmpdir(), 'arena-identity-render-'));
  const chrome = await launchChromium(BROWSER.path ?? '');
  const cdp = await connect(chrome.wsUrl);
  try {
    const out: Measured[] = [];
    for (const [index, page] of IDENTITY_PAGES.entries()) {
      const html = readFileSync(join(repoRoot, page), 'utf8')
        .replace(/href="https:\/\/arena\.dravensoft\.org\/intro\/styles\.css"/, `href="${SHEET}"`)
        .replace(/^@import url\("https:\/\/fonts\.googleapis\.com[^\n]*\n/gm, '');
      const file = join(dir, `page-${index}.html`);
      writeFileSync(file, html);
      const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
      await cdp.send('Page.enable', {}, sessionId);
      const loaded = new Promise<void>((resolve) => {
        cdp.on((message) => {
          if (message.method === 'Page.loadEventFired' && (message as { sessionId?: string }).sessionId === sessionId) resolve();
        });
      });
      await cdp.send('Page.navigate', { url: pathToFileURL(file).href }, sessionId);
      await withTimeout(loaded, LOAD.ms, `${page}: the page never loaded within ${LOAD.ms}ms, which is that size because ${LOAD.why}`);
      out.push({ page, panels: await evaluate(cdp, MEASURE, sessionId) });
      await cdp.send('Target.closeTarget', { targetId });
    }
    return out;
  } finally {
    await chrome.kill();
    rmSync(dir, { recursive: true, force: true });
  }
}

const BUDGET_MS = budgetFor(DEVTOOLS, GRACE, REAP, LOAD) + (IDENTITY_PAGES.length - 1) * LOAD.ms * BUDGET_SLACK;

test('each identity page draws both polarities from its own roles',
  { timeout: BUDGET_MS, skip: NEEDS_A_BROWSER }, async () => {
  const wrong = (await drawn()).flatMap((m) => ROWS.flatMap((row) => row.problems(m).map((p) => `${m.page}: ${row.name}: ${p}`)));
  assert.deepEqual(wrong, []);
});
