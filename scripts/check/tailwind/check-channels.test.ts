/* A custom property has one writer kind across the compiled sheets: a family, a token sheet, or
 * Tailwind's own --tw-* inside a component sheet. A manifest declaring any other property is a
 * component deciding a channel, which is the defect the vocabulary exists to remove. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { declared, channelProblems } from './check-channels.ts';

const sheets = (extra: { kind: 'family' | 'component' | 'token' | 'hue' | 'plugin'; rel: string; css: string }[] = []) => [
  { kind: 'family' as const, rel: 'v/Fill.generated.css', css: '@scope (.arena-fill) { :scope[data-arena-part="button"] { --arena-fill-width: 100%; } }' },
  { kind: 'component' as const, rel: 'c/ArenaButton.styles.generated.css', css: '.arena-button__root { --tw-shadow: 0 0 #0000; width: var(--arena-fill-width,fit-content); }' },
  { kind: 'token' as const, rel: 't/spacing.generated.css', css: ':root { --sp-1: 4px; }' },
  { kind: 'hue' as const, rel: 'h/ArenaButton.hues.generated.css', css: '.arena-button__root:where([data-arena-destructive]) { --arena-hue-ink: var(--hue-danger-ink); }' },
  { kind: 'plugin' as const, rel: 'plugin-style-store/catalogue/x/plugin.css', css: '.a { color: var(--arena-hue-ink); }' },
  ...extra,
];

test('a declaration is read where it is declared, never where it is used', () => {
  assert.deepEqual(declared('a { --x: 1; width: var(--y, 2px); } b{--z:3}'), ['--x', '--z']);
});

type Sheet = { kind: 'family' | 'component' | 'token' | 'hue' | 'plugin'; rel: string; css: string; restates?: string };
type Row = { name: string; sheets: () => Sheet[]; clean?: true; matches?: RegExp[]; notMatches?: RegExp[] };

const check = (rows: Row[]) => {
  assert.ok(rows.length > 0);
  for (const row of rows) {
    const problems = channelProblems(row.sheets() as never);
    if (row.clean) assert.deepEqual(problems, [], row.name);
    for (const pattern of row.matches ?? []) assert.match(problems.join('\n'), pattern, row.name);
    for (const pattern of row.notMatches ?? []) assert.doesNotMatch(problems.join('\n'), pattern, row.name);
  }
};

const HUE = '@layer utilities {\n  .arena-tag__root:where([data-arena-tone="danger"]) {\n    --arena-hue-ink: var(--hue-danger-ink);\n    --arena-hue-edge: var(--hue-danger-edge);\n    --arena-hue-fill-strong: var(--hue-danger-fill-strong);\n    --arena-hue-fill-soft: var(--hue-danger-fill-soft);\n  }\n  .arena-tag__root:where([data-arena-tone="neutral"]) {\n    --arena-hue-ink: initial;\n    --arena-hue-edge: initial;\n    --arena-hue-fill-strong: initial;\n    --arena-hue-fill-soft: initial;\n  }\n}\n';
const hued = (read: string, hue = HUE, more: { kind: 'family' | 'component' | 'token' | 'hue' | 'plugin'; rel: string; css: string }[] = []) => sheets([
  ...more,
  { kind: 'hue', rel: 'frameworks/tailwind/consume/hues/display/arena-tag/ArenaTag.hues.generated.css', css: hue },
  { kind: 'component', rel: 'frameworks/tailwind/consume/components/display/arena-tag/ArenaTag.styles.generated.css', css: read },
]).filter((one) => one.rel !== 'h/ArenaButton.hues.generated.css');

const RESTATING: Sheet[] = [
  { kind: 'family', rel: 'v/Density.generated.css', css: '@scope (.arena-compact){:scope{--dz-ctl-h:32px}}', restates: 'dz' },
  { kind: 'component', rel: 'c/a.css', css: '.a{--tw-x:1}' },
  { kind: 'token', rel: 't/spacing.css', css: ':root{--dz-ctl-h:40px}' },
  { kind: 'hue', rel: 'h/a.hues.generated.css', css: '.a:where([data-arena-x]){--arena-hue-ink:red}' },
  { kind: 'plugin', rel: 'plugin-style-store/p/plugin.css', css: '.a{color:red}' },
];
const reset: Sheet = { kind: 'family', rel: 'v/Grid.generated.css', css: '@layer utilities { [data-arena-boundary] > * { --arena-grid-min: initial; } }' };
const pluginY = (css: string): Sheet => ({ kind: 'plugin', rel: 'plugin-style-store/catalogue/y/plugin.css', css });
const button = (css: string) => () => sheets().map((one) => (one.kind === 'component' ? { ...one, css } : one));

const WRITER_ROWS: Row[] = [
  { name: 'one writer kind per property is clean', sheets: () => sheets(), clean: true },
  {
    name: 'a token sheet declaring a family channel is a second writer',
    sheets: () => sheets([{ kind: 'token', rel: 't/x.css', css: ':root { --arena-fill-width: 1px; }' }]),
    matches: [/--arena-fill-width has two writer kinds: family \(v\/Fill\.generated\.css\) and token \(t\/x\.css\)/],
  },
  {
    name: "a manifest declaring a channel, or any property not Tailwind's own, fails",
    sheets: () => sheets([{ kind: 'component', rel: 'c/ArenaMenu.styles.generated.css', css: '.x { --arena-fill-width: 100%; }' }]),
    matches: [/c\/ArenaMenu\.styles\.generated\.css declares --arena-fill-width/],
  },
  {
    name: 'a family sheet declaring a property outside --arena-* fails',
    sheets: () => sheets([{ kind: 'family', rel: 'v/Bad.generated.css', css: '.x { --sp-1: 0; }' }]),
    matches: [/v\/Bad\.generated\.css declares --sp-1/],
  },
  { name: 'no family sheet is a failure rather than a clean pass', sheets: () => sheets().filter((s) => s.kind !== 'family'), matches: [/found 0 family sheet/] },
  { name: 'no component sheet is a failure rather than a clean pass', sheets: () => sheets().filter((s) => s.kind !== 'component'), matches: [/found 0 component sheet/] },
  { name: 'a family restating a contract group writes that group, and the token sheet is its one allowed second writer', sheets: () => RESTATING, clean: true },
  {
    name: 'a second family writing the restated group still fails',
    sheets: () => [...RESTATING, { kind: 'family', rel: 'v/Stack.generated.css', css: '@scope (.arena-stack){:scope{--dz-ctl-h:1px}}' }],
    matches: [/Stack\.generated\.css declares --dz-ctl-h/],
  },
  { name: 'a plugin sheet may declare --hue-danger-fill-strong', sheets: () => sheets([pluginY(':root { --hue-danger-fill-strong: red; }')]), notMatches: [/--hue-danger-fill-strong/] },
  { name: 'no plugin sheet is a failure rather than a clean pass', sheets: () => sheets().filter((s) => s.kind !== 'plugin'), matches: [/found 0 plugin sheet/] },
  { name: 'an axis is written by the family sheet that resets it and by no other writer kind', sheets: () => sheets([reset]), clean: true },
  {
    name: 'an axis a token sheet also writes has two writer kinds',
    sheets: () => sheets([reset, { kind: 'token', rel: 't/x.css', css: ':root { --arena-grid-min: 1px; }' }]),
    matches: [/--arena-grid-min has two writer kinds: family \(v\/Grid\.generated\.css\) and token \(t\/x\.css\)/],
  },
  {
    name: 'an axis a component sheet writes fails',
    sheets: () => sheets([reset, { kind: 'component', rel: 'c/ArenaGrid.styles.generated.css', css: '.x { --arena-grid-min: 8px; }' }]),
    matches: [/c\/ArenaGrid\.styles\.generated\.css declares --arena-grid-min/],
  },
  { name: 'a component sheet may hand its icon an ink', sheets: button('.arena-button__root { --tw-shadow: 0 0 #0000; --arena-icon-ink: red; }'), clean: true },
  { name: 'a component sheet declares no other channel', sheets: button('.arena-button__root { --arena-icon-edge: red; }'), matches: [/declares --arena-icon-edge/] },
];

test('a custom property has one writer kind, a sheet kind that is missing fails, and only the owning kind declares a channel', () => {
  check(WRITER_ROWS);
});

const HUE_READ_RIGHT = '.arena-tag__root:where([data-arena-tone="danger"]) { color: var(--arena-hue-ink); @supports (color: red) { border-color: var(--arena-hue-edge); } }';
const HUE_COMPOUND = '.arena-tag__root:where(:not([data-arena-disabled])[data-arena-tone="danger"]) { color: var(--arena-hue-ink); }';
const NOT_GIVEN = /reads a hue channel its own element is not given/;

const HUE_ROWS: Row[] = [
  { name: 'a component sheet declaring a hue channel fails', sheets: () => hued('.x { --arena-hue-ink: red; }'), matches: [/ArenaTag\.styles\.generated\.css declares --arena-hue-ink/] },
  {
    name: 'a token sheet declaring a hue channel fails',
    sheets: () => hued('.x{--tw-a:1}', HUE, [{ kind: 'token', rel: 't/y.css', css: ':root{--arena-hue-edge:red}' }]),
    matches: [/t\/y\.css declares --arena-hue-edge, which only a hue sheet writes/],
  },
  { name: 'a hue sheet declaring anything but the hue channels fails', sheets: () => hued('.x{--tw-a:1}', '.a { --arena-x: 1; }'), matches: [/ArenaTag\.hues\.generated\.css declares --arena-x/] },
  { name: 'no hue sheet is a failure rather than a clean pass', sheets: () => sheets().filter((s) => s.kind !== 'hue'), matches: [/found 0 hue sheet/] },
  { name: 'a read under a selector the hue sheet writes a hue on is clean', sheets: () => hued(HUE_READ_RIGHT), clean: true },
  { name: 'a read under a compound selector the hue sheet writes a hue on is clean', sheets: () => hued(HUE_COMPOUND), clean: true },
  {
    name: 'a read its own element is given initial fails',
    sheets: () => hued('.arena-tag__root:where([data-arena-tone="neutral"]) { color: var(--arena-hue-ink); }'),
    matches: [/reads a hue channel its own element is not given, so it would read whatever an ancestor wrote/],
  },
  { name: 'a read with no rule at all fails', sheets: () => hued('.arena-tag__dot { color: var(--arena-hue-ink); }'), matches: [NOT_GIVEN] },
  { name: 'a read under a value the hue sheet never writes fails', sheets: () => hued('.arena-tag__root:where([data-arena-tone="warning"]) { color: var(--arena-hue-ink); }'), matches: [NOT_GIVEN] },
  { name: 'a plugin sheet reading a hue channel stays allowed', sheets: () => sheets(), clean: true },
  ...['--arena-hue-ink', '--arena-hue-edge', '--arena-hue-fill-strong', '--arena-hue-fill-soft'].map((channel) => ({
    name: `a plugin sheet writing ${channel} fails`,
    sheets: () => sheets([pluginY(`.b { ${channel}: red; }`)]),
    matches: [new RegExp(`plugin-style-store/catalogue/y/plugin\\.css declares ${channel}, which only a hue sheet writes`)],
  })),
];

test('a hue channel is written by a hue sheet only, read where its own element is given it, and never written by a plugin', () => {
  check(HUE_ROWS);
});
