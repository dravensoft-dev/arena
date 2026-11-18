/* The hue sheet writes the channels of a hue on each slot a group's attribute reaches, once
 * per value, `initial` for a value mapped to no hue. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { HUE_CHANNELS, alwaysProblems, hueProblems, hueRules, huePath, readHues } from './hue-sheet.ts';
import { channelProblems } from '../../check/tailwind/check-channels.ts';
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

const fixed = (extra: Partial<ComponentManifest> = {}): ComponentManifest => probe({
  slots: { root: 'flex', mark: 'size-1', note: 'text-[color:var(--arena-hue-ink)]' },
  hues: { always: { note: 'danger' }, tone: { neutral: null, danger: 'danger' }, colorId: { 1: 'identity-1', 3: 'identity-3' } },
  ...extra,
} as Partial<ComponentManifest>);

test('always writes a slot\'s fixed hue on the bare slot class, ahead of every group rule', () => {
  const css = hueRules(fixed(), hues);
  assert.match(css, /^\.arena-probe__note \{\n\s+--arena-hue-ink: var\(--hue-danger-ink\);/);
  assert.doesNotMatch(css, /arena-probe__note:where/);
  assert.deepEqual(hueProblems(fixed(), hues), []);
});

test('an always entry naming a missing slot, no hue, an unknown hue or a slot a hued group reaches is reported', () => {
  const text = (always: Record<string, unknown>) =>
    hueProblems(fixed({ hues: { always, tone: { neutral: null, danger: 'danger' } } } as Partial<ComponentManifest>), hues).join('\n');
  assert.match(text({ gone: 'danger' }), /hues\.always\.gone names a slot the manifest lacks/);
  assert.match(text({ note: null }), /hues\.always\.note names no hue/);
  assert.match(text({ note: 'crimson' }), /hues\.always\.note names hue "crimson"/);
  assert.match(text({ root: 'danger' }), /hues\.always\.root is a slot the hued group tone also reaches/);
  assert.match(alwaysProblems(fixed({ variants: { always: { a: {} } } } as Partial<ComponentManifest>)).join('\n'), /has a group named always/);
});

test('check:channels accepts a base read only while always gives its slot the hue', () => {
  const component = { kind: 'component' as const, rel: 'c/components/ArenaProbe.styles.generated.css', css: '.arena-probe__note { color: var(--arena-hue-ink); }' };
  const others = [
    { kind: 'family' as const, rel: 'f/a.css', css: '.f { --arena-f-x: 1; }' },
    { kind: 'token' as const, rel: 't/a.css', css: ':root { --hue-danger-ink: red; }' },
  ];
  const hueSheet = (manifest: ComponentManifest) => ({ kind: 'hue' as const, rel: 'h/hues/ArenaProbe.hues.generated.css', css: hueRules(manifest, hues) });
  const reads = (manifest: ComponentManifest) => channelProblems([...others, component, hueSheet(manifest)])
    .filter((problem) => problem.includes('ArenaProbe'));
  assert.deepEqual(reads(fixed()), []);
  const dropped = fixed({ hues: { tone: { neutral: null, danger: 'danger' } } } as Partial<ComponentManifest>);
  assert.match(reads(dropped).join('\n'), /reads a hue channel its own element is not given/);
});
