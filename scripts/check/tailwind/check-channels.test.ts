/* A custom property has one writer kind across the compiled sheets: a family, a token sheet, or
 * Tailwind's own --tw-* inside a component sheet. A manifest declaring any other property is a
 * component deciding a channel, which is the defect the vocabulary exists to remove. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { declared, channelProblems } from './check-channels.ts';

const sheets = (extra: { kind: 'family' | 'component' | 'token'; rel: string; css: string }[] = []) => [
  { kind: 'family' as const, rel: 'v/Fill.generated.css', css: '@scope (.arena-fill) { &[data-arena-part="button"] { --arena-fill-width: 100%; } }' },
  { kind: 'component' as const, rel: 'c/ArenaButton.styles.generated.css', css: '.arena-button__root { --tw-shadow: 0 0 #0000; width: var(--arena-fill-width,fit-content); }' },
  { kind: 'token' as const, rel: 't/spacing.generated.css', css: ':root { --sp-1: 4px; }' },
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
