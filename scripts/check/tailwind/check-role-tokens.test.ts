import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { scaleUsesIn, evaluateManifest, staleAllowances, zeroManifestProblem, derivedSetsProblem, padStems, gapRoles, SCALE_USES } from './check-role-tokens.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

test('a radius scale step in a class string is reported', () => {
  assert.deepEqual(scaleUsesIn('bg-neutral rounded-lg overflow-hidden'), ['rounded-lg']);
});

test('a bracketed scale use is reported, so the brackets and parens are matched literally rather than as a pattern', () => {
  assert.deepEqual(scaleUsesIn('inline-flex border-[length:var(--bw)] bg-primary'), ['--bw']);
});

test('a scale token inside an arbitrary property is reported too, so a transition triple cannot hide one', () => {
  assert.deepEqual(
    scaleUsesIn('[transition:background_var(--dur-fast)_var(--ease-out),box-shadow_var(--dur-mid)_var(--ease-out)]'),
    ['--dur-fast', '--dur-mid', '--ease-out'],
  );
});

test('the easing scale is caught as a utility as well, which is the half a transition writes as a class', () => {
  assert.deepEqual(scaleUsesIn('transition-[background] duration-[var(--dur-hover)] ease-out'), ['ease-out']);
});

test('an easing spelled as a token counts once and not twice, because the utility pattern cannot match inside var(--ease-out)', () => {
  assert.deepEqual(scaleUsesIn('duration-[var(--dur-hover)] ease-[var(--ease-out)]'), ['--ease-out']);
});

test('the motion roles are not scale uses, at either end of the transition', () => {
  assert.deepEqual(scaleUsesIn('duration-[var(--dur-hover)] ease-hover'), []);
  assert.deepEqual(scaleUsesIn('duration-[var(--dur-state)] ease-state'), []);
});

test('the easings no role answers are left alone, because an entrance and the brand gesture are not a hover', () => {
  assert.deepEqual(scaleUsesIn('ease-in-out ease-emphatic'), []);
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
  const manifest = { component: 'Fixture', slots: { root: 'bg-neutral rounded-lg' }, kind: { root: 'surface' } };
  assert.deepEqual(evaluateManifest(manifest, new Map()), [
    { component: 'Fixture', slot: 'root', utility: 'rounded-lg', role: 'rounded-surface', kind: 'surface', why: 'scale' },
  ]);
});

test('an allowance keyed by component, slot and utility suppresses that one finding and no other', () => {
  const manifest = {
    component: 'Fixture',
    slots: { bubble: 'rounded-lg', panel: 'rounded-lg' },
    kind: { bubble: 'none', panel: 'none' },
  };
  const allowed = new Map([['Fixture:bubble:rounded-lg', 'a bubble is sized by its label']]);
  assert.deepEqual(evaluateManifest(manifest, allowed).map((f) => f.slot), ['panel']);
});

test('a scale use inside a compoundVariants branch is found, so a class cannot hide behind a compound', () => {
  const manifest = {
    component: 'Fixture',
    slots: { root: 'flex' },
    kind: { root: 'none' },
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

test('the palette step behind a track is a role position, so a manifest naming it is a finding', () => {
  const manifest = { component: 'ArenaThing', slots: { track: 'relative rounded-pill bg-base-300' }, kind: { track: 'none' } };
  const findings = evaluateManifest(manifest, new Map());
  assert.deepEqual(findings.map((f) => f.utility), ['bg-base-300'],
    'nothing else in that class string stands where a role belongs');
  assert.match(findings[0]?.role ?? '', /bg-track/);
});

test('a fill utility is matched whole, so bg-base-300 is not read out of bg-base-300\\/40', () => {
  assert.deepEqual(scaleUsesIn('bg-base-300'), ['bg-base-300']);
  assert.deepEqual(scaleUsesIn('hover:bg-base-300'), ['bg-base-300'],
    'a variant prefix does not change which utility is standing there');
});

const siblings = (trigger: string) => ({
  component: 'Fixture',
  slots: { item: 'px-row-x py-row-y', trigger },
  kind: { item: 'row', trigger: 'row' },
});

test('two sibling row slots on the row roles raise nothing', () => {
  assert.deepEqual(evaluateManifest(siblings('px-row-x py-row-y'), new Map()), []);
});

test('a sibling that drifts to another kind\'s role and a step is reported on itself alone', () => {
  const findings = evaluateManifest(siblings('px-control-x py-2.5'), new Map());
  const by = (utility: string) => findings.find((f) => f.utility === utility);
  assert.equal(by('px-control-x')?.why, 'kind');
  assert.equal(by('py-2.5')?.why, 'step');
  assert.ok(findings.every((f) => f.slot === 'trigger' && f.kind === 'row'));
  assert.equal(findings.length, 2);
});

test('a padding arbitrary over the spacing scale is a step even on a none slot', () => {
  const manifest = { component: 'Fixture', slots: { panel: 'pt-[calc(var(--sp-1)*5.5)]' }, kind: { panel: 'none' } };
  const findings = evaluateManifest(manifest, new Map());
  assert.deepEqual(findings.map((f) => [f.utility, f.why]), [['pt-[calc(var(--sp-1)*5.5)]', 'step']]);
});

test('a row exception that keeps the control padding role is a kind finding, and one that keeps a step is a step', () => {
  const manifest = {
    component: 'Fixture',
    slots: { a: 'py-[calc(var(--pad-control-y)*var(--dz-row-scale-y))]', b: 'py-[calc(var(--sp-1)*3.5*var(--dz-row-scale-y))]' },
    kind: { a: 'row', b: 'row' },
  };
  assert.deepEqual(evaluateManifest(manifest, new Map()).map((f) => [f.slot, f.why]), [['a', 'kind'], ['b', 'step']]);
});

test('the one-word surface padding stem is judged by kind, bare and as an operand', () => {
  const manifest = {
    component: 'Fixture',
    slots: { a: 'p-surface', b: 'px-surface', c: 'px-[var(--pad-surface)]', d: 'p-surface' },
    kind: { a: 'row', b: 'floating', c: 'row', d: 'surface' },
  };
  assert.deepEqual(evaluateManifest(manifest, new Map()).map((f) => [f.slot, f.utility, f.why]), [
    ['a', 'p-surface', 'kind'],
    ['b', 'px-surface', 'kind'],
    ['c', 'px-[var(--pad-surface)]', 'kind'],
  ]);
});

test('a channel read falling back to a padding role is judged by that role\'s kind', () => {
  const manifest = {
    component: 'Fixture',
    slots: { a: 'py-[var(--arena-size-badge-pad-y,var(--pad-marker-y))]', b: 'py-[var(--arena-size-badge-pad-y,var(--pad-surface))]' },
    kind: { a: 'marker', b: 'marker' },
  };
  assert.deepEqual(evaluateManifest(manifest, new Map()).map((f) => [f.slot, f.why]), [['b', 'kind']]);
});

test('a radius role outside the kind is a kind finding', () => {
  const manifest = { component: 'Fixture', slots: { panel: 'rounded-surface' }, kind: { panel: 'floating' } };
  assert.deepEqual(evaluateManifest(manifest, new Map()).map((f) => [f.utility, f.why]), [['rounded-surface', 'kind']]);
});

test('a gap role outside the kind is a kind finding, and a kind-free gap never is', () => {
  const manifest = { component: 'Fixture', slots: { a: 'gap-row', b: 'gap-items gap-stack' }, kind: { a: 'control', b: 'none' } };
  assert.deepEqual(evaluateManifest(manifest, new Map()).map((f) => [f.slot, f.utility, f.why]), [['a', 'gap-row', 'kind']]);
});

test('zero resets, auto margins and kind-free shapes are never findings, and a state prefix is stripped', () => {
  const manifest = {
    component: 'Fixture',
    slots: { root: 'p-0 gap-0 mx-auto rounded-pill hover:gap-group' },
    kind: { root: 'none' },
  };
  assert.deepEqual(evaluateManifest(manifest, new Map()), []);
  const stepped = { component: 'Fixture', slots: { root: 'hover:-mt-1' }, kind: { root: 'none' } };
  assert.deepEqual(evaluateManifest(stepped, new Map()).map((f) => [f.utility, f.why]), [['-mt-1', 'step']]);
});

test('a slot with no kind is a missing-kind finding', () => {
  const manifest = { component: 'Fixture', slots: { root: 'flex' } };
  assert.deepEqual(evaluateManifest(manifest, new Map()).map((f) => [f.slot, f.why]), [['root', 'missing-kind']]);
});

test('a recorded step and a recorded kind use are excused by their key', () => {
  const manifest = siblings('px-control-x py-2.5');
  const allowed = new Map([['Fixture:trigger:px-control-x', 'r'], ['Fixture:trigger:py-2.5', 'r']]);
  assert.deepEqual(evaluateManifest(manifest, allowed), []);
});

for (const [cls, kind, bad] of [
  ['pt-surface-head-top', 'surface', 'marker'],
  ['px-floating-edge-x', 'floating', 'surface'],
  ['gap-actions', 'floating', 'marker'],
  ['py-control-text-y', 'control', 'marker'],
  ['py-control-text-y', 'field', 'marker'],
  ['px-row-floating-x', 'row', 'control'],
  ['py-row-floating-y', 'row', 'control'],
  ['gap-row-floating', 'row', 'control'],
  ['py-nav-row-y', 'row', 'control'],
  ['px-nav-row-x', 'row', 'control'],
  ['py-band-y', 'band', 'row'],
  ['py-band-y', 'band', 'none'],
] as const) {
  test(`${cls} passes on a ${kind} slot and fails on a ${bad} slot`, () => {
    const at = (k: string) => evaluateManifest({ component: 'X', slots: { s: cls }, kind: { s: k } }, new Map());
    assert.deepEqual(at(kind), []);
    assert.equal(at(bad).length, 1);
  });
}

test('a pad stem in roles.json that no kind lists fails on a slot of every kind', () => {
  assert.equal(padStems().has('row-indent'), true);
  for (const k of ['surface', 'floating', 'control', 'field', 'marker', 'status', 'row', 'band', 'none']) {
    const found = evaluateManifest({ component: 'X', slots: { s: 'pt-row-indent' }, kind: { s: k } }, new Map());
    assert.equal(found.length, 1, k);
  }
});

test('the derived sets are not empty, and an empty one is a failure', () => {
  assert.equal(derivedSetsProblem(), null);
  assert.notEqual(derivedSetsProblem(new Set(), gapRoles()), null);
  assert.notEqual(derivedSetsProblem(padStems(), new Set()), null);
});

type Dimension = { value: number; unit: string };
type Entry = { $value: Dimension | string };

const ANSWERS = /\b([a-z]+(?:-[a-z]+)*) answers (\d+(?:\.\d+)?)px/g;

const defaultTokens = () => readJson(join(repoRoot, 'plugin-style-store/default/plugin.tokens.json')) as Record<string, Entry>;
const spacing = () => (readJson(join(repoRoot, 'contracts/design/spacing.json')) as { sp: Record<string, Entry> }).sp;

function answerClaims(reasons: Iterable<string>) {
  return [...reasons].flatMap((reason) => [...reason.matchAll(ANSWERS)].map((m) => ({ role: m[1] as string, px: Number(m[2]) })));
}

function claimProblems(claims: { role: string; px: number }[], tokens: Record<string, Entry>, sp: Record<string, Entry>) {
  const problems: string[] = [];
  for (const { role, px } of claims) {
    let value = tokens[role]?.$value;
    if (typeof value === 'string') value = sp[value.replace(/^\{sp\.|\}$/g, '')]?.$value;
    if (!value || typeof value === 'string') { problems.push(`${role} answers ${px}px in a SCALE_USES reason, and the default plugin has no such role`); continue; }
    if (value.unit !== 'px' || value.value !== px) problems.push(`${role} answers ${px}px in a SCALE_USES reason, and the default plugin answers ${value.value}${value.unit}`);
  }
  return problems;
}

test('every pixel figure a SCALE_USES reason gives a role is the default plugin\'s own answer', () => {
  const claims = answerClaims(SCALE_USES.values());
  assert.ok(claims.length > 0, 'a guard over no claim proves nothing');
  assert.deepEqual(claimProblems(claims, defaultTokens(), spacing()), []);
});

test('a reason whose figure drifts from the default plugin fails, and a role with no token fails too', () => {
  const drifted = [...SCALE_USES.values()].map((reason) => reason.replace('pad-row-y answers 10px', 'pad-row-y answers 11px'));
  const problems = claimProblems(answerClaims(drifted), defaultTokens(), spacing());
  assert.ok(problems.length > 0);
  assert.match(problems[0] ?? '', /pad-row-y answers 11px/);
  assert.equal(claimProblems([{ role: 'pad-nowhere', px: 4 }], defaultTokens(), spacing()).length, 1);
  assert.deepEqual(claimProblems(answerClaims(['a slot where gap-row answers 12px']), defaultTokens(), spacing()), []);
});
