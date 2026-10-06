/* A custom property has one writer kind across the compiled sheets: a family, a token sheet, or
 * Tailwind's own --tw-* inside a component sheet. A manifest declaring any other property is a
 * component deciding a channel, which is the defect the vocabulary exists to remove. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { declared, channelProblems } from './check-channels.ts';

const sheets = (extra: { kind: 'family' | 'component' | 'token' | 'hue'; rel: string; css: string }[] = []) => [
  { kind: 'family' as const, rel: 'v/Fill.generated.css', css: '@scope (.arena-fill) { &[data-arena-part="button"] { --arena-fill-width: 100%; } }' },
  { kind: 'component' as const, rel: 'c/ArenaButton.styles.generated.css', css: '.arena-button__root { --tw-shadow: 0 0 #0000; width: var(--arena-fill-width,fit-content); }' },
  { kind: 'token' as const, rel: 't/spacing.generated.css', css: ':root { --sp-1: 4px; }' },
  { kind: 'hue' as const, rel: 'h/ArenaButton.hues.generated.css', css: '.arena-button__root:where([data-arena-destructive]) { --arena-hue-ink: var(--hue-danger-ink); }' },
  ...extra,
];

test('a declaration is read where it is declared, never where it is used', () => {
  assert.deepEqual(declared('a { --x: 1; width: var(--y, 2px); } b{--z:3}'), ['--x', '--z']);
});

test('one writer kind per property is clean', () => {
  assert.deepEqual(channelProblems(sheets()), []);
});

test('a token sheet declaring a family channel is a second writer', () => {
  assert.match(channelProblems(sheets([{ kind: 'token', rel: 't/x.css', css: ':root { --arena-fill-width: 1px; }' }])).join('\n'),
    /--arena-fill-width has two writer kinds: family \(v\/Fill\.generated\.css\) and token \(t\/x\.css\)/);
});

test('a manifest declaring a channel, or any property not Tailwind\'s own, fails', () => {
  assert.match(channelProblems(sheets([{ kind: 'component', rel: 'c/ArenaMenu.styles.generated.css', css: '.x { --arena-fill-width: 100%; }' }])).join('\n'),
    /c\/ArenaMenu\.styles\.generated\.css declares --arena-fill-width/);
});

test('a family sheet declaring a property outside --arena-* fails', () => {
  assert.match(channelProblems(sheets([{ kind: 'family', rel: 'v/Bad.generated.css', css: '.x { --sp-1: 0; }' }])).join('\n'),
    /v\/Bad\.generated\.css declares --sp-1/);
});

test('no family sheet, or no component sheet, is a failure rather than a clean pass', () => {
  assert.match(channelProblems(sheets().filter((s) => s.kind !== 'family')).join('\n'), /found 0 family sheet/);
  assert.match(channelProblems(sheets().filter((s) => s.kind !== 'component')).join('\n'), /found 0 component sheet/);
});

test('a family restating a contract group writes that group, and the token sheet is its one allowed second writer', () => {
  const sheets = [
    { kind: 'family', rel: 'v/Density.generated.css', css: '@scope (.arena-compact){:scope{--dz-ctl-h:32px}}', restates: 'dz' },
    { kind: 'component', rel: 'c/a.css', css: '.a{--tw-x:1}' },
    { kind: 'token', rel: 't/spacing.css', css: ':root{--dz-ctl-h:40px}' },
    { kind: 'hue', rel: 'h/a.hues.generated.css', css: '.a:where([data-arena-x]){--arena-hue-ink:red}' },
  ] as any;
  assert.deepEqual(channelProblems(sheets), []);
  const stray = [...sheets, { kind: 'family', rel: 'v/Stack.generated.css', css: '@scope (.arena-stack){:scope{--dz-ctl-h:1px}}' }];
  assert.match(channelProblems(stray).join('\n'), /Stack\.generated\.css declares --dz-ctl-h/);
});

const HUE = '@layer utilities {\n  .arena-tag__root:where([data-arena-tone="danger"]) {\n    --arena-hue-ink: var(--hue-danger-ink);\n    --arena-hue-edge: var(--hue-danger-edge);\n    --arena-hue-fill-strong: var(--hue-danger-fill-strong);\n    --arena-hue-fill-soft: var(--hue-danger-fill-soft);\n  }\n  .arena-tag__root:where([data-arena-tone="neutral"]) {\n    --arena-hue-ink: initial;\n    --arena-hue-edge: initial;\n    --arena-hue-fill-strong: initial;\n    --arena-hue-fill-soft: initial;\n  }\n}\n';
const hued = (read: string, hue = HUE, more: { kind: 'family' | 'component' | 'token' | 'hue'; rel: string; css: string }[] = []) => sheets([
  ...more,
  { kind: 'hue', rel: 'frameworks/tailwind/consume/hues/display/arena-tag/ArenaTag.hues.generated.css', css: hue },
  { kind: 'component', rel: 'frameworks/tailwind/consume/components/display/arena-tag/ArenaTag.styles.generated.css', css: read },
]).filter((one) => one.rel !== 'h/ArenaButton.hues.generated.css');

test('a component sheet declaring a hue channel fails, and so does a family or token sheet', () => {
  assert.match(channelProblems(hued('.x { --arena-hue-ink: red; }')).join('\n'), /ArenaTag\.styles\.generated\.css declares --arena-hue-ink/);
  assert.match(channelProblems(hued('.x{--tw-a:1}', HUE, [{ kind: 'token', rel: 't/y.css', css: ':root{--arena-hue-edge:red}' }])).join('\n'),
    /t\/y\.css declares --arena-hue-edge, which only a hue sheet writes/);
});

test('a hue sheet declaring anything but the four channels fails', () => {
  assert.match(channelProblems(hued('.x{--tw-a:1}', '.a { --arena-x: 1; }')).join('\n'), /ArenaTag\.hues\.generated\.css declares --arena-x/);
});

test('no hue sheet is a failure rather than a clean pass', () => {
  assert.match(channelProblems(sheets().filter((s) => s.kind !== 'hue')).join('\n'), /found 0 hue sheet/);
});

test('a read under a selector the hue sheet writes a hue on is clean', () => {
  const read = '.arena-tag__root:where([data-arena-tone="danger"]) { color: var(--arena-hue-ink); @supports (color: red) { border-color: var(--arena-hue-edge); } }';
  assert.deepEqual(channelProblems(hued(read)), []);
  const compound = '.arena-tag__root:where(:not([data-arena-disabled])[data-arena-tone="danger"]) { color: var(--arena-hue-ink); }';
  assert.deepEqual(channelProblems(hued(compound)), []);
});

test('a read its own element is not given fails: initial, or no rule at all', () => {
  const initial = '.arena-tag__root:where([data-arena-tone="neutral"]) { color: var(--arena-hue-ink); }';
  assert.match(channelProblems(hued(initial)).join('\n'), /reads a hue channel its own element is not given, so it would read whatever an ancestor wrote/);
  const none = '.arena-tag__dot { color: var(--arena-hue-ink); }';
  assert.match(channelProblems(hued(none)).join('\n'), /reads a hue channel its own element is not given/);
  const wrongValue = '.arena-tag__root:where([data-arena-tone="warning"]) { color: var(--arena-hue-ink); }';
  assert.match(channelProblems(hued(wrongValue)).join('\n'), /reads a hue channel its own element is not given/);
});
