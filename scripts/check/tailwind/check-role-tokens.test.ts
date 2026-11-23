import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { scaleUsesIn, evaluateManifest, staleAllowances, zeroManifestProblem, derivedSetsProblem, padStems, gapRoles, SCALE_USES, stateLiteral, stateLiteralFindings, paletteFindings, paletteMessage, paletteUtility, collect } from './check-role-tokens.ts';
import * as roleTokens from './check-role-tokens.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

const SCALE_USE_ROWS: { name: string; classes: string; expected: string[] }[] = [
  { name: 'a radius scale step in a class string is reported', classes: 'bg-neutral rounded-lg overflow-hidden', expected: ['rounded-lg'] },
  { name: 'a bracketed scale use is reported, so the brackets and parens are matched literally rather than as a pattern', classes: 'inline-flex border-[length:var(--bw)] bg-primary', expected: ['--bw'] },
  {
    name: 'a scale token inside an arbitrary property is reported too, so a transition triple cannot hide one',
    classes: '[transition:background_var(--dur-fast)_var(--ease-out),box-shadow_var(--dur-mid)_var(--ease-out)]',
    expected: ['--dur-fast', '--dur-mid', '--ease-out'],
  },
  { name: 'the easing scale is caught as a utility as well, which is the half a transition writes as a class', classes: 'transition-[background] duration-[var(--dur-hover)] ease-out', expected: ['ease-out'] },
  { name: 'an easing spelled as a token counts once and not twice, because the utility pattern cannot match inside var(--ease-out)', classes: 'duration-[var(--dur-hover)] ease-[var(--ease-out)]', expected: ['--ease-out'] },
  { name: 'the motion roles are not scale uses, at the hover end of the transition', classes: 'duration-[var(--dur-hover)] ease-hover', expected: [] },
  { name: 'the motion roles are not scale uses, at the state end of the transition', classes: 'duration-[var(--dur-state)] ease-state', expected: [] },
  { name: 'the easings no role answers are left alone, because an entrance and the brand gesture are not a hover', classes: 'ease-in-out ease-emphatic', expected: [] },
  { name: 'a scale step behind a state modifier is still a scale use', classes: 'bg-transparent hover:shadow-2', expected: ['shadow-2'] },
  { name: 'a longer utility that merely contains a banned one is not a scale use', classes: 'border-[length:var(--bw-strong)]', expected: [] },
  { name: 'a role utility is not a scale use', classes: 'rounded-surface border-[length:var(--bw-surface)] duration-[var(--dur-hover)]', expected: [] },
  { name: 'a longer token name is not the scale token it starts with', classes: 'border-[length:var(--bw-separator)] duration-[var(--dur-state)]', expected: [] },
];

test('scaleUsesIn reports a scale step, a token and an easing where they are written and leaves the roles alone', () => {
  for (const row of SCALE_USE_ROWS) assert.deepEqual(scaleUsesIn(row.classes), row.expected, row.name);
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

test('an allowance whose key occurs nowhere fails as stale, so the map cannot outlive the code it excused', () => {
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

test('the palette step behind a track is refused once, by the palette refusal, with the track hint', () => {
  const manifest = { component: 'ArenaThing', slots: { track: 'relative rounded-pill bg-base-300' }, kind: { track: 'none' } } as never;
  assert.deepEqual(evaluateManifest(manifest, new Map()).map((f) => f.utility), [], 'the scale check names nothing');
  const found = paletteFindings(manifest);
  assert.deepEqual(found.map((f) => f.utility), ['bg-base-300']);
  assert.match(found[0]?.hint ?? '', /bg-track/);
});

test('a palette utility is matched whole, so bg-base-300 is not read out of bg-base-300/40, and a variant prefix does not hide it', () => {
  assert.equal(paletteUtility('bg-base-300'), 'bg-base-300');
  assert.equal(paletteUtility('hover:bg-base-300/40'), 'bg-base-300');
  assert.equal(paletteUtility('bg-base-3000'), undefined);
  assert.equal(paletteUtility('bg-surface'), undefined);
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

test('an empty derived set is a failure', () => {
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

const fixture = (extra: Record<string, unknown>) => ({ component: 'ArenaFixture', slots: { root: 'flex' }, kind: { root: 'none' }, ...extra }) as never;

const FINDING_ROWS: { name: string; extra: Record<string, unknown>; allowances?: Map<string, string>; expected: { branch?: string; utility?: string }[] }[] = [
  { name: 'a literal opacity on a disabled branch is refused', extra: { variants: { disabled: { true: { root: 'opacity-50' } } } }, expected: [{ branch: 'disabled=true', utility: 'opacity-50' }] },
  { name: 'a literal alpha under a hover modifier is refused', extra: { slots: { root: 'hover:bg-primary/22' } }, expected: [{}] },
  { name: 'a literal alpha under a disabled modifier is refused', extra: { slots: { root: 'disabled:text-ink-muted/40' } }, expected: [{}] },
  { name: 'a literal alpha under a has-focus-visible modifier is refused', extra: { slots: { root: '[&:has(~input:focus-visible)]:ring-edge-focus/16' } }, expected: [{}] },
  {
    name: 'visibility and base alphas are not states',
    extra: { slots: { root: 'focus:opacity-100 opacity-0 bg-overlay-media/72 text-ink-body/(--level-ink-body) [&::-webkit-calendar-picker-indicator]:opacity-60 opacity-60 text-sm/6' } },
    expected: [],
  },
  { name: 'a var level on a disabled branch is not a literal', extra: { variants: { disabled: { true: { root: 'opacity-[var(--fade-disabled)]' } } } }, expected: [] },
  { name: 'a compound variant with a state key is a state branch', extra: { compoundVariants: [{ disabled: true, class: { item: 'opacity-60' } }] }, expected: [{ branch: 'compound[disabled=true]' }] },
  { name: 'a compound variant with no state key is not a state branch', extra: { compoundVariants: [{ size: 'sm', class: { item: 'opacity-60' } }] }, expected: [] },
  ...['checked', 'indeterminate', 'error', 'open', 'readOnly', 'dragging'].map((key) => ({
    name: `the whole state vocabulary is a state branch: ${key}`,
    extra: { variants: { [key]: { true: { root: 'opacity-50' } } } },
    expected: [{}],
  })),
  {
    name: 'an allowance in STATE_LITERALS suppresses one finding',
    extra: { variants: { disabled: { true: { root: 'opacity-50' } } } },
    allowances: new Map([['ArenaFixture:root:opacity-50', 'a reason']]),
    expected: [],
  },
];

test('stateLiteralFindings refuses a literal on a state branch or under a state modifier and lets visibility, base alphas and allowances through', () => {
  for (const row of FINDING_ROWS) {
    const found = stateLiteralFindings(fixture(row.extra), row.allowances);
    assert.equal(found.length, row.expected.length, row.name);
    row.expected.forEach((want, i) => {
      if (want.branch !== undefined) assert.equal(found[i]?.branch, want.branch, row.name);
      if (want.utility !== undefined) assert.equal(found[i]?.utility, want.utility, row.name);
    });
  }
});

const STATE_LITERAL_ROWS: [name: string, utility: string, inBranch: boolean, expected: boolean][] = [
  ...(
    [
      ['opacity-50', true, true],
      ['opacity-50', false, false],
      ['hover:bg-primary/22', false, true],
      ['aria-disabled:opacity-45', false, true],
      ['opacity-100', true, false],
    ] as const
  ).map(([u, b, e]): [string, string, boolean, boolean] => ['stateLiteral judges the utility alone and the branch it sits in', u, b, e]),
  ...['opacity-[.5]', 'opacity-[0.5]', 'opacity-[50%]', 'bg-x/[0.4]', 'bg-x/[40%]'].map((u): [string, string, boolean, boolean] => ['an arbitrary literal opacity or alpha is a literal', u, true, true]),
  ...['opacity-[var(--fade-disabled)]', 'opacity-(--fade-disabled)', 'bg-x/[var(--lvl)]', 'bg-x/(--lvl)'].map((u): [string, string, boolean, boolean] => ['a var level is not a literal', u, true, false]),
  ...(
    [
      ['opacity-50!', true, true],
      ['bg-x/20!', true, true],
      ['!opacity-50', true, true],
      ['opacity-100!', true, false],
      ['opacity-50!', false, false],
    ] as const
  ).map(([u, b, e]): [string, string, boolean, boolean] => ['a suffix important does not hide a literal', u, b, e]),
  ...['group-hover:opacity-50', 'peer-checked:opacity-50', 'group-aria-selected:bg-x/20', 'group-hover/name:opacity-50', 'peer-disabled/field:opacity-40'].map((u): [string, string, boolean, boolean] => [
    'group and peer modifiers naming a state are state modifiers',
    u,
    false,
    true,
  ]),
  ['group and peer modifiers naming no state are not state modifiers', 'group-first:opacity-50', false, false],
  ['group and peer modifiers naming no state are not state modifiers', 'group:opacity-50', false, false],
  ['a data-state variant is a state modifier', 'data-[state=open]:opacity-50', false, true],
  ['a data-size variant is not a state modifier', 'data-[size=sm]:opacity-50', false, false],
];

test('stateLiteral judges a utility alone, a literal against a var level, an important mark, group and peer modifiers and data variants', () => {
  assert.ok(STATE_LITERAL_ROWS.length > 0);
  for (const [name, utility, inBranch, expected] of STATE_LITERAL_ROWS) assert.equal(stateLiteral(utility, inBranch), expected, `${name}: ${utility} (inBranch ${inBranch})`);
});

const palettePart = (slots: Record<string, string>, component = 'ArenaFixture') => ({ component, slots, kind: {} }) as never;

test('a palette utility is refused with no allowance', () => {
  const found = paletteFindings(palettePart({ root: 'flex bg-base-300 hover:bg-primary-fill/50 border-t-base-300 bg-surface' }, 'ArenaFixture'));
  assert.deepEqual(found.map((f) => [f.component, f.slot, f.utility]), [
    ['ArenaFixture', 'root', 'bg-base-300'],
    ['ArenaFixture', 'root', 'hover:bg-primary-fill/50'],
    ['ArenaFixture', 'root', 'border-t-base-300'],
  ]);
  const message = paletteMessage(found[0]!);
  for (const said of ['ArenaFixture', 'root', 'bg-base-300', 'bg-track']) assert.ok(message.includes(said), `the message names ${said}: ${message}`);
  assert.equal('PALETTE_READS' in roleTokens, false);
  assert.equal('stalePaletteReads' in roleTokens, false);
});

test('the shipped manifests draw no state with a literal and read no palette key, and every STATE_LITERALS key was seen', () => {
  const { states, palette, stale } = collect();
  assert.deepEqual(states, []);
  assert.deepEqual(palette, []);
  assert.deepEqual(stale, []);
});

test('cat and heat keys are palette keys too', () => {
  const found = paletteFindings(palettePart({ root: 'bg-cat-3 text-heat-5/60 fill-surface' }));
  assert.deepEqual(found.map((f) => f.utility), ['bg-cat-3', 'text-heat-5/60']);
});

const refused = (token: string) => paletteFindings(palettePart({ root: `flex ${token}` })).map((f) => f.utility);

const REFUSAL_ROWS: { name: string; token: string; refused: string[]; utility?: [input: string, expected: string] }[] = [
  { name: 'a palette key read through an arbitrary colour value is refused', token: 'bg-[color:var(--color-primary)]', refused: ['bg-[color:var(--color-primary)]'], utility: ['bg-[color:var(--color-primary)]', 'var(--color-primary)'] },
  { name: 'a palette key read through a paren shorthand is refused', token: 'bg-(--color-primary)', refused: ['bg-(--color-primary)'] },
  {
    name: 'a palette key written into an arbitrary property is refused',
    token: '[--arena-icon-ink:var(--color-base-300)]',
    refused: ['[--arena-icon-ink:var(--color-base-300)]'],
  },
  {
    name: 'a palette key inside an arbitrary value is matched whole',
    token: 'bg-[color:var(--color-primary-fill)]',
    refused: ['bg-[color:var(--color-primary-fill)]'],
    utility: ['bg-[color:var(--color-primary-fill)]', 'var(--color-primary-fill)'],
  },
  {
    name: 'a palette-like name that is not a palette key is not matched',
    token: 'bg-[color:var(--color-primary-soft)] bg-[color:var(--color-surface)] bg-[color:var(--fill-primary)]',
    refused: [],
  },
  { name: 'a leading important mark does not hide a palette utility', token: '!bg-base-300', refused: ['!bg-base-300'], utility: ['hover:!bg-base-300', 'bg-base-300'] },
  { name: 'a trailing important mark does not hide a palette utility', token: 'bg-base-300!', refused: ['bg-base-300!'] },
  ...['shadow-base-300', 'inset-shadow-neutral/40', 'inset-ring-primary', 'ring-offset-base-100', 'drop-shadow-neutral', 'text-shadow-base-content'].map((token) => ({
    name: `a shadow, inset or offset colour reads a palette key too: ${token}`,
    token,
    refused: [token],
  })),
  {
    name: 'a shadow, inset, offset or drop shadow scale or role utility reads no palette key',
    token: 'shadow-sm shadow-none ring-offset-2 drop-shadow-lg text-shadow-xs inset-shadow-none shadow-surface-floating',
    refused: [],
  },
];

test('a palette key is refused wherever a class writes it and no role or scale utility is mistaken for one', () => {
  for (const row of REFUSAL_ROWS) {
    assert.deepEqual(refused(row.token), row.refused, row.name);
    if (row.utility) assert.equal(paletteUtility(row.utility[0]), row.utility[1], row.name);
  }
});
