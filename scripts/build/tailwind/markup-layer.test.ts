/* A markup class sits in @layer components, so a rule or a utility of the adopter beats it whatever order the sheets load in,
 * and the class still beats the preflight and the sheets below it. Each row is a page drawn in Chromium from the React package
 * sheet, with the adopter's CSS written before it, and the property read back through the cascade. A skip is DECLARED and never called. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findChromium, launchChromium, DEVTOOLS, GRACE, REAP } from '../../lib/arena/chromium.ts';
import { connect, evaluate } from '../../lib/arena/cdp.ts';
import { budgetFor, deadline, type Deadline } from '../../lib/arena/deadline.ts';
import { LAYER_ORDER } from '../../lib/tailwind/component-sheets.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { withTimeout } from '../../utils/with-timeout.ts';

const LOAD: Deadline = deadline('markup-layer:load', 30_000,
  'a cold browser reads the package sheet and its imports from disk before the cascade it measures is complete');

const BROWSER = findChromium();
const NEEDS_A_BROWSER = BROWSER.path ? false : `no Chromium available to measure in: ${BROWSER.reason}`;
const SHEETS = ['frameworks/react/dist/arena.css', 'contracts/design-generated/palette.generated.css']
  .map((sheet) => pathToFileURL(join(repoRoot, sheet)).href);

type Row = { name: string; markup: string; css: string; property: string; want: string | { reads: string } };
const SURFACE = { reads: 'var(--fill-surface)' };
const ROWS: Row[] = [
  { name: 'an unlayered fill of the adopter beats arena-interactive at rest',
    markup: '<div id="a" class="arena-interactive mine">x</div>', css: '.mine { background-color: var(--fill-surface); }',
    property: 'background-color', want: SURFACE },
  { name: 'an unlayered display of the adopter beats arena-stack',
    markup: '<div id="a" class="arena-stack mine"><i>x</i></div>', css: '.mine { display: grid; }',
    property: 'display', want: 'grid' },
  { name: 'a bg utility of the adopter beats arena-interactive at rest',
    markup: '<div id="a" class="arena-interactive bg-mine">x</div>', css: `${LAYER_ORDER}@layer utilities { .bg-mine { background-color: var(--fill-surface); } }`,
    property: 'background-color', want: SURFACE },
  { name: 'a button wearing arena-interactive keeps the transparent rest under the preflight',
    markup: '<button id="a" class="arena-interactive">x</button>',
    css: `${LAYER_ORDER}@layer base { button[id] { background-color: #fff; } }`,
    property: 'background-color', want: 'rgba(0, 0, 0, 0)' },
  { name: 'arena-interactive still draws the selected wash on an element with no fill of its own',
    markup: '<div id="a" class="arena-interactive" aria-selected="true">x</div>', css: '',
    property: 'background-color',
    want: { reads: 'color-mix(in oklab, var(--fill-selected) var(--level-accent-soft-primary), transparent)' } },
  { name: 'a density class on a component still re-answers its control height',
    markup: '<button id="a" class="arena-button__root arena-compact">x</button>', css: '',
    property: 'min-height', want: '32px' },
];

const page = (row: Row) => `<!doctype html><html><head><meta charset="utf-8"><style>${row.css}</style>`
  + `${SHEETS.map((href) => `<link rel="stylesheet" href="${href}">`).join('')}</head><body>${row.markup}</body></html>`;

const MEASURE = (property: string, reads: string | null) => `(() => {
  const own = getComputedStyle(document.getElementById('a'))[${JSON.stringify(property)}];
  if (${JSON.stringify(reads)} === null) return { own, want: null };
  const probe = document.createElement('i');
  probe.style[${JSON.stringify(property)}] = ${JSON.stringify(reads)};
  document.body.append(probe);
  return { own, want: getComputedStyle(probe)[${JSON.stringify(property)}] };
})()`;

async function drawn(): Promise<{ own: string; want: string }[]> {
  const dir = mkdtempSync(join(tmpdir(), 'arena-markup-layer-'));
  const chrome = await launchChromium(BROWSER.path ?? '');
  const cdp = await connect(chrome.wsUrl);
  try {
    const out: { own: string; want: string }[] = [];
    for (const [index, row] of ROWS.entries()) {
      const file = join(dir, `row-${index}.html`);
      writeFileSync(file, page(row));
      const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
      await cdp.send('Page.enable', {}, sessionId);
      const loaded = new Promise<void>((resolve) => {
        cdp.on((message) => {
          if (message.method === 'Page.loadEventFired' && (message as { sessionId?: string }).sessionId === sessionId) resolve();
        });
      });
      await cdp.send('Page.navigate', { url: pathToFileURL(file).href }, sessionId);
      await withTimeout(loaded, LOAD.ms, `${row.name}: the page never loaded within ${LOAD.ms}ms, which is that size because ${LOAD.why}`);
      const reads = typeof row.want === 'string' ? null : row.want.reads;
      const got = await evaluate(cdp, MEASURE(row.property, reads), sessionId);
      out.push({ own: got.own, want: reads === null ? row.want as string : got.want });
      await cdp.send('Target.closeTarget', { targetId });
    }
    return out;
  } finally {
    await chrome.kill();
    rmSync(dir, { recursive: true, force: true });
  }
}

const BUDGET_MS = budgetFor(DEVTOOLS, GRACE, REAP, ...ROWS.map(() => LOAD));

test('a markup class sits under the adopter and over the preflight',
  { timeout: BUDGET_MS, skip: NEEDS_A_BROWSER }, async () => {
  const seen = await drawn();
  const wrong = ROWS.flatMap((row, index) => {
    const one = seen[index] as { own: string; want: string };
    return one.own === one.want ? [] : [`${row.name}: ${row.property} computes ${one.own}, expected ${one.want}`];
  });
  assert.deepEqual(wrong, []);
});
