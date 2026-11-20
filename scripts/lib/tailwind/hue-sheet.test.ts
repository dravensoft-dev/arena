/* The hue sheet writes the channels of a hue on each slot a group's attribute reaches, once
 * per value, `initial` for a value mapped to no hue. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { HUE_CHANNELS, hueProblems, hueRules, huePath, readHues } from './hue-sheet.ts';
import * as hueSheet from './hue-sheet.ts';
import type { ComponentManifest } from './manifest-shapes.ts';

const hues = readHues();

const probe = (extra: Partial<ComponentManifest> = {}): ComponentManifest => ({
  component: 'ArenaProbe',
  slots: { root: 'flex', mark: 'size-1' },
  variants: {
    tone: { neutral: {}, danger: { root: 'text-[color:var(--arena-hue-ink)]' } },
    colorId: { 1: { mark: 'bg-[color:var(--arena-hue-ink)]' }, 3: { mark: 'bg-[color:var(--arena-hue-ink)]' } },
  },
  hues: { tone: { neutral: null, danger: 'danger' }, colorId: { 1: 'identity-1', 3: 'identity-3' } },
  ...extra,
} as ComponentManifest);

test('the channels are the ones a hue sheet may declare', () => {
  assert.deepEqual([...HUE_CHANNELS], ['--arena-hue-ink', '--arena-hue-edge', '--arena-hue-fill-strong', '--arena-hue-fill-soft', '--arena-hue-on-ink']);
});

test('every status hue writes its on-ink role, and an identity hue writes none', () => {
  const tones = ['success', 'warning', 'danger', 'info'];
  const css = hueRules({
    component: 'ArenaProbe', slots: { root: 'flex' },
    variants: { tone: Object.fromEntries([...tones, 'cat'].map((tone) => [tone, { root: 'x' }])) },
    hues: { tone: { ...Object.fromEntries(tones.map((tone) => [tone, tone])), cat: 'identity-2' } },
  } as unknown as ComponentManifest, hues);
  for (const tone of tones)
    assert.match(css, new RegExp(`data-arena-tone="${tone}"\\]\\) \\{[^}]*--arena-hue-on-ink: var\\(--hue-${tone}-on-ink\\);`));
  assert.match(css, /data-arena-tone="cat"\]\) \{[^}]*--arena-hue-on-ink: initial;/);
});

test('Hues.json expands identity-N to the eight categorical colours', () => {
  assert.deepEqual([...hues.keys()].filter((name) => name.startsWith('identity')),
    [1, 2, 3, 4, 5, 6, 7, 8].map((n) => `identity-${n}`));
  assert.equal(hues.get('identity-3')?.ink, 'var(--color-cat-3)');
  assert.equal(hues.get('identity-3')?.['fill-soft'],
    'color-mix(in oklab, var(--color-cat-3) var(--tint-soft), var(--fill-surface))');
  assert.equal(hues.get('danger')?.['fill-soft'],
    'color-mix(in oklab, var(--hue-danger-fill-soft) var(--level-hue-soft-danger), transparent)');
});

test('a value is a rule on every slot its group reaches, selected by the group attribute', () => {
  const css = hueRules(probe(), hues);
  assert.match(css, /\.arena-probe__root:where\(\[data-arena-tone="danger"\]\) \{\n\s+--arena-hue-ink: var\(--hue-danger-ink\);/);
  assert.match(css, /\.arena-probe__mark:where\(\[data-arena-color-id="3"\]\) \{\n\s+--arena-hue-ink: var\(--color-cat-3\);/);
  assert.doesNotMatch(css, /arena-probe__root:where\(\[data-arena-color-id/);
});

test('a value mapped to no hue writes every channel as initial', () => {
  const css = hueRules(probe(), hues);
  const neutral = /\.arena-probe__root:where\(\[data-arena-tone="neutral"\]\) \{([^}]*)\}/.exec(css)?.[1] ?? '';
  for (const channel of HUE_CHANNELS) assert.match(neutral, new RegExp(`${channel}: initial;`));
});

test('rules follow the manifest group order, so a later group wins on a shared slot', () => {
  const css = hueRules(probe(), hues);
  assert.ok(css.indexOf('data-arena-tone') < css.indexOf('data-arena-color-id'));
});

test('on adds the slots a hue is written on beyond the ones the classes touch', () => {
  const css = hueRules(probe({ hues: { tone: { on: ['mark'], neutral: null, danger: 'danger' } } } as Partial<ComponentManifest>), hues);
  assert.match(css, /\.arena-probe__mark:where\(\[data-arena-tone="danger"\]\)/);
});

test('a manifest with no hues key has no rules', () => {
  assert.equal(hueRules({ component: 'ArenaProbe', slots: { root: 'flex' } } as ComponentManifest, hues), '');
});

test('a hue absent from Hues.json is reported, and refused when written', () => {
  const bad = probe({ hues: { tone: { neutral: null, danger: 'crimson' } } } as Partial<ComponentManifest>);
  assert.match(hueProblems(bad, hues).join('\n'), /ArenaProbe\.hues\.tone\.danger names hue "crimson"/);
  assert.throws(() => hueRules(bad, hues), /crimson/);
  assert.deepEqual(hueProblems(probe(), hues), []);
});

test('a hue naming a group or a value the manifest lacks is reported', () => {
  const lacking = probe({ hues: { size: { a: 'danger' }, tone: { loud: 'danger' } } } as Partial<ComponentManifest>);
  const text = hueProblems(lacking, hues).join('\n');
  assert.match(text, /hues\.size names no group/);
  assert.match(text, /hues\.tone\.loud names a value the group lacks/);
});

test('a boolean group is selected by presence, and its false value by absence', () => {
  const css = hueRules({
    component: 'ArenaProbe', slots: { root: 'flex' },
    variants: { destructive: { true: { root: 'x' }, false: {} } },
    hues: { destructive: { true: 'danger', false: null } },
  } as unknown as ComponentManifest, hues);
  assert.match(css, /\.arena-probe__root:where\(\[data-arena-destructive\]\) \{/);
  assert.match(css, /\.arena-probe__root:where\(:not\(\[data-arena-destructive\]\)\) \{/);
});

test('a hue sheet sits under consume/hues, mirroring the manifest folder', () => {
  assert.equal(huePath('frameworks/tailwind/components/display/arena-badge/ArenaBadge.manifest.json'),
    'frameworks/tailwind/consume/hues/display/arena-badge/ArenaBadge.hues.generated.css');
});

test('a hues key is a group of the manifest, and always is no key of its own', () => {
  const fixed = probe({
    slots: { root: 'flex', mark: 'size-1', note: 'text-[color:var(--arena-hue-ink)]' },
    hues: { always: { note: 'danger' }, tone: { neutral: null, danger: 'danger' } },
  } as Partial<ComponentManifest>);
  assert.match(hueProblems(fixed, hues).join('\n'), /ArenaProbe\.hues\.always names no group of the manifest/);
  assert.doesNotMatch(hueRules(fixed, hues), /arena-probe__note/);
  assert.equal('alwaysProblems' in hueSheet, false);
  assert.equal('ALWAYS' in hueSheet, false);
});
