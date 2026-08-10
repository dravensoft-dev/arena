import test from 'node:test';
import assert from 'node:assert/strict';
import { scaleUsesIn, evaluateManifest, staleAllowances, zeroManifestProblem } from './check-role-tokens.ts';

test('a radius scale step in a class string is reported', () => {
  assert.deepEqual(scaleUsesIn('bg-base-200 rounded-lg overflow-hidden'), ['rounded-lg']);
});

test('a bracketed scale use is reported, so the brackets and parens are matched literally rather than as a pattern', () => {
  assert.deepEqual(scaleUsesIn('inline-flex border-[length:var(--bw)] bg-primary'), ['--bw']);
});

test('a scale token inside an arbitrary property is reported too, so a transition triple cannot hide one', () => {
  assert.deepEqual(
    scaleUsesIn('[transition:background_var(--dur-fast)_var(--ease-out),box-shadow_var(--dur-mid)_var(--ease-out)]'),
    ['--dur-fast', '--dur-mid'],
  );
});

test('a scale step behind a state modifier is still a scale use', () => {
  assert.deepEqual(scaleUsesIn('bg-transparent hover:shadow-2'), ['shadow-2']);
});

test('a longer utility that merely contains a banned one is not a scale use', () => {
  assert.deepEqual(scaleUsesIn('border-[length:var(--bw-strong)]'), []);
});

test('a role utility is not a scale use', () => {
  assert.deepEqual(scaleUsesIn('rounded-surface border-[length:var(--bw-surface)] duration-[var(--dur-hover)]'), []);
});

test('a longer token name is not the scale token it starts with', () => {
  assert.deepEqual(scaleUsesIn('border-[length:var(--bw-separator)] duration-[var(--dur-state)]'), []);
});

test('evaluateManifest names the role that replaces the scale use it found', () => {
  const manifest = { component: 'Fixture', slots: { root: 'bg-base-200 rounded-lg' } };
  assert.deepEqual(evaluateManifest(manifest, new Map()), [
    { component: 'Fixture', slot: 'root', utility: 'rounded-lg', role: 'rounded-surface' },
  ]);
});

test('an allowance keyed by component, slot and utility suppresses that one finding and no other', () => {
  const manifest = {
    component: 'Fixture',
    slots: { bubble: 'rounded-lg', panel: 'rounded-lg' },
  };
  const allowed = new Map([['Fixture:bubble:rounded-lg', 'a bubble is sized by its label']]);
  assert.deepEqual(evaluateManifest(manifest, allowed).map((f) => f.slot), ['panel']);
});

test('a scale use inside a compoundVariants branch is found, so a class cannot hide behind a compound', () => {
  const manifest = {
    component: 'Fixture',
    slots: { root: 'flex' },
    compoundVariants: [{ narrow: false, class: { root: 'rounded-lg' } }],
  };
  assert.deepEqual(evaluateManifest(manifest, new Map()).map((f) => f.slot), ['root']);
});

test('an allowance whose key no longer occurs fails as stale, so the map cannot outlive the code it excused', () => {
  const allowed = new Map([['Gone:root:rounded-lg', 'it was moved']]);
  const problems = staleAllowances(new Set(['Fixture:root:rounded-lg']), allowed);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /Gone:root:rounded-lg/);
});

test('an allowance that is still in use is not stale', () => {
  const allowed = new Map([['Fixture:root:rounded-lg', 'a reason']]);
  assert.deepEqual(staleAllowances(new Set(['Fixture:root:rounded-lg']), allowed), []);
});

test('zeroManifestProblem fails on an empty walk rather than reporting a clean pass', () => {
  assert.match(zeroManifestProblem([]) ?? '', /0 manifest/i);
});

test('zeroManifestProblem is null for a non-empty file list', () => {
  assert.equal(zeroManifestProblem(['X.manifest.json']), null);
});
