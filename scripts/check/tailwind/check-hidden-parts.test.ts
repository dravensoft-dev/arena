import test from 'node:test';
import assert from 'node:assert/strict';
import { HELD, composedSlots, hiddenPartProblems, hiddenSlots, positioned } from './check-hidden-parts.ts';
import { readManifests } from '../arena/check-measured-box.ts';

test('hiddenSlots reads whole tokens', () => {
  assert.equal(hiddenSlots('sr-only'), true);
  assert.equal(hiddenSlots('absolute opacity-0 size-0'), true);
  assert.equal(hiddenSlots('absolute inset-0 bg-current'), false);
  assert.equal(hiddenSlots('before:absolute opacity-0'), false);
});

test('positioned names the four positioning tokens', () => {
  for (const token of ['relative', 'absolute', 'fixed', 'sticky']) assert.equal(positioned(`flex ${token}`), true);
  assert.equal(positioned('flex before:relative'), false);
});

const other = { component: 'Other', slots: { root: 'relative', x: 'sr-only' } };

test('an unpositioned root with a hidden slot is one problem naming it', () => {
  const problems = hiddenPartProblems([{ component: 'X', slots: { root: 'flex', name: 'sr-only' } }, other], new Map());
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /^X\.name /);
});

test('a positioned root holds its hidden slot', () => {
  assert.deepEqual(hiddenPartProblems([{ component: 'X', slots: { root: 'relative flex', name: 'sr-only' } }], new Map()), []);
});

test('a manifest with no root slot needs a HELD entry for each hidden slot', () => {
  const x = { component: 'X', slots: { segment: 'relative', input: 'absolute opacity-0' } };
  assert.equal(hiddenPartProblems([x, other], new Map()).length, 1);
  assert.deepEqual(hiddenPartProblems([x, other], new Map([['X.input', { by: 'segment', why: 'w' }]])), []);
  const loose = { component: 'X', slots: { segment: 'flex', input: 'absolute opacity-0' } };
  assert.equal(hiddenPartProblems([loose, other], new Map([['X.input', { by: 'segment', why: 'w' }]])).length, 1);
  assert.equal(hiddenPartProblems([x, other], new Map([['X.input', { by: 'gone', why: 'w' }]])).length, 1);
});

test('a stale or empty HELD entry fails', () => {
  const stale = hiddenPartProblems([{ component: 'X', slots: { root: 'relative', name: 'sr-only' } }],
    new Map([['X.name', { by: 'root', why: 'w' }]]));
  assert.equal(stale.length, 1);
  assert.match(stale[0] ?? '', /stale/);
  const unknown = hiddenPartProblems([other], new Map([['Other.nothing', { by: 'x', why: 'w' }]]));
  assert.equal(unknown.length, 1);
  assert.match(unknown[0] ?? '', /names no hidden slot/);
});

test('no hidden slot at all is a problem', () => {
  const problems = hiddenPartProblems([{ component: 'X', slots: { root: 'flex' } }], new Map());
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /found no hidden slot/);
});

const collapsing = (root: string) => ({
  component: 'X',
  slots: { root, label: 'min-w-0' },
  variants: { collapsed: { true: { label: 'sr-only' }, false: { label: 'ps-2' } } },
});

test('a variant option that makes a slot hidden under an unpositioned root is one problem naming it', () => {
  const problems = hiddenPartProblems([collapsing('flex'), other], new Map());
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /^X\.label /);
});

test('a positioned root holds a slot a variant option makes hidden', () => {
  assert.deepEqual(hiddenPartProblems([collapsing('relative flex'), other], new Map()), []);
});

test('a HELD entry holds a hidden slot a variant option makes, and goes stale once the root is positioned', () => {
  const entry = new Map([['X.label', { by: 'item', why: 'w' }]]);
  const loose = { ...collapsing('flex'), slots: { root: 'flex', label: 'min-w-0', item: 'relative' } };
  assert.deepEqual(hiddenPartProblems([loose, other], entry), []);
  assert.match(hiddenPartProblems([collapsing('relative flex'), other], entry)[0] ?? '', /stale/);
});

test('composedSlots is the base alone, then the base with each option appended', () => {
  const composed = composedSlots(collapsing('flex'));
  assert.equal(composed.length, 3);
  assert.equal(composed[0]?.label, 'min-w-0');
  assert.equal(composed[1]?.label, 'min-w-0 sr-only');
  assert.equal(composed[2]?.label, 'min-w-0 ps-2');
});

test('the real tree holds no unpositioned hidden part', () => {
  assert.deepEqual(hiddenPartProblems(readManifests().values(), HELD), []);
});
