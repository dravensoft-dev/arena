/* The no-flash snippet exists twice, in no-fouc.html and in theme.md. Each copy runs in a fresh
 * window with storage seeded, and the two bodies must stay equal. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Window } from 'happy-dom';

const HTML = readFileSync(new URL('./no-fouc.html', import.meta.url), 'utf8');
const DOC = readFileSync(new URL('../../../skills/design/references/theme.md', import.meta.url), 'utf8');

const bodyOf = (source: string): string => {
  const m = /<script>([\s\S]*?)<\/script>/.exec(source.replace(/<!--[\s\S]*?-->/g, ''));
  assert.ok(m, 'a <script> block');
  return m[1];
};

const htmlBody = bodyOf(HTML);
const docBody = bodyOf(/```html\n([\s\S]*?)```/.exec(DOC)![1]);

const strip = (code: string): string => code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/\s+/g, '');

const CACHE = 'arena-runtime-palette';
const good = {
  name: 'sunset',
  polarity: 'light',
  properties: { '--arena-palette': 'sunset', '--color-base-100': '#fff1e6', '--level-soft': '40%' },
};

function run(code: string, storage: Record<string, string>, light = false): { classes: string[]; style: Record<string, string> } {
  const win = new Window();
  for (const [k, v] of Object.entries(storage)) win.localStorage.setItem(k, v);
  win.matchMedia = ((q: string) => ({ matches: light && q.includes('light') })) as never;
  win.eval(code);
  const el = win.document.documentElement;
  const style: Record<string, string> = {};
  for (let i = 0; i < el.style.length; i++) {
    const k = el.style.item(i);
    style[k] = el.style.getPropertyValue(k);
  }
  return { classes: [...el.classList], style };
}

const withCache = (value: unknown, name = 'sunset') => ({ 'arena-theme': name, [CACHE]: typeof value === 'string' ? value : JSON.stringify(value) });
const bad = (patch: Record<string, unknown>) => ({ ...good, ...patch });
const props = (p: Record<string, string>) => bad({ properties: { '--arena-palette': 'sunset', ...p } });

for (const [label, code] of [['no-fouc.html', htmlBody], ['theme.md', docBody]] as const) {
  test(`${label}: a valid runtime cache paints the hook class and every property`, () => {
    const r = run(code, withCache(good));
    assert.deepEqual(r.classes, ['arena-polarity-light']);
    assert.deepEqual(r.style, good.properties);
  });

  test(`${label}: a cache that fails a rule leaves the first-visit result`, () => {
    const cases: unknown[] = [
      'not json{',
      bad({ polarity: 'sepia' }),
      bad({ name: 'Sunset', properties: { '--arena-palette': 'Sunset' } }),
      bad({ name: '9dusk', properties: { '--arena-palette': '9dusk' } }),
      bad({ properties: [] }),
      props({ '--font-size': '12px' }),
      props({ '--color-base-100': '#FFF1E6' }),
      props({ '--color-base-100': '#fff1e6aa' }),
      props({ '--level-soft': '40px' }),
      props({ '--arena-palette': 'other' }),
    ];
    for (const c of cases) {
      const stored = typeof c === 'object' && c !== null && (c as { name: string }).name !== 'sunset' ? (c as { name: string }).name : 'sunset';
      const r = run(code, withCache(c, stored));
      assert.deepEqual(r.style, {}, JSON.stringify(c));
      assert.ok(!r.classes.some((x) => x.startsWith('arena-polarity-')), JSON.stringify(c));
    }
  });

  test(`${label}: a cache for another name than the stored one is ignored`, () => {
    const r = run(code, withCache(good, 'other'));
    assert.deepEqual(r.style, {});
    assert.deepEqual(r.classes, []);
  });

  test(`${label}: a declared stored name behaves as before`, () => {
    assert.deepEqual(run(code, { 'arena-theme': 'light' }).classes, ['arena-light']);
    assert.deepEqual(run(code, { 'arena-theme': 'dark' }).classes, []);
    const declared = { name: 'light', polarity: 'dark', properties: { '--arena-palette': 'light', '--color-base-100': '#000000' } };
    const r = run(code, withCache(declared, 'light'));
    assert.deepEqual(r.style, {}, 'a declared stored name never consults the cache');
    assert.deepEqual(r.classes, ['arena-light']);
  });

  test(`${label}: the boundary shapes the layers accept paint, and the rest are first visits`, () => {
    const empty = run(code, withCache(bad({ properties: {} })));
    assert.deepEqual(empty.classes, ['arena-polarity-light']);
    assert.deepEqual(empty.style, {});
    const noMark = run(code, withCache(bad({ properties: { '--color-base-100': '#fff1e6' } })));
    assert.deepEqual(noMark.classes, ['arena-polarity-light']);
    assert.deepEqual(noMark.style, { '--color-base-100': '#fff1e6' });
  });

  test(`${label}: a first visit answers the device`, () => {
    assert.deepEqual(run(code, {}, true).classes, ['arena-light']);
  });
}

test('the two snippet bodies are equal, ignoring comments and whitespace', () => {
  assert.equal(strip(docBody), strip(htmlBody));
});
