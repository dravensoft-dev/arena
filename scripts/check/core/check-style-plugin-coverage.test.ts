import test from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { readJson } from '../../utils/read-file.ts';
import { readColorSlots } from '../../lib/core/color-slots.ts';
import { ROOT_PLUGIN } from './check-style-plugin.ts';
import type { SlotCatalogue } from '../../generate/core/arena-cli/slots.ts';
import {
  COMPLETE, WITNESS_EXEMPT, collect, immovableRoles, movedRoles, staleExemptions, phantomParts, unpaintedParts, unreachedRoles, zeroCoverageProblems, restatedInWitness, sheetsByPart, unansweredSlots, answersIn,
} from './check-style-plugin-coverage.ts';

test('a role complete does not move is a role nothing can reach', () => {
  const problems = unreachedRoles(['r-surface', 'bw-surface'], ['r-surface']);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /bw-surface/);
});

const ARENA = 'com.dravensoft.arena';

test('a keyword whose closed set holds one value cannot be moved, so it is not owed a distinct answer', () => {
  const roles = {
    'hue-one': { $type: 'keyword', $extensions: { [ARENA]: { values: ['transparent'] } } },
    'tt-label': { $type: 'keyword', $extensions: { [ARENA]: { values: ['none', 'uppercase'] } } },
    'r-surface': { $type: 'dimension' },
  };
  assert.deepEqual(immovableRoles(roles), ['hue-one']);
  assert.deepEqual(unreachedRoles(Object.keys(roles), ['r-surface', 'tt-label'], immovableRoles(roles)), []);
});

test('a role with a set of several values is still owed a distinct answer', () => {
  const roles = { 'tt-label': { $type: 'keyword', $extensions: { [ARENA]: { values: ['none', 'uppercase'] } } } };
  assert.deepEqual(immovableRoles(roles), []);
  assert.equal(unreachedRoles(['tt-label'], [], immovableRoles(roles)).length, 1);
});

test('a role complete answers with the value default already gives has not moved', () => {
  assert.deepEqual(movedRoles({ 'r-surface': '4px', 'bw-surface': '1px' }, { 'r-surface': '4px', 'bw-surface': '2px' }),
    ['bw-surface']);
});

test('a part complete does not paint is a hook nothing can reach', () => {
  const problems = unpaintedParts(['card.body', 'hero.title'], ['card.body']);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /hero\.title/);
});

test('a rule naming a hook no manifest emits paints nothing and still counted as coverage', () => {
  const problems = phantomParts(['table.td'], ['table.td', 'table.td-mono']);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /table\.td-mono/);
});

test('the witness is asked both ways, so neither half can be true on its own', () => {
  assert.deepEqual(phantomParts(['card.body'], ['card.body']), [],
    'a plugin painting exactly what the manifests emit has nothing to report');
  assert.deepEqual(unpaintedParts(['card.body'], ['card.body']), []);
});

test('a zero walk is a failure and not a clean pass', () => {
  assert.equal(zeroCoverageProblems(0).length, 1);
  assert.deepEqual(zeroCoverageProblems(69), []);
});

test('the tree holds: every declared role moves and every emitted part is painted', () => {
  const { problems, roles, parts } = collect();
  assert.deepEqual(problems, []);
  assert.ok(roles > 0 && parts > 0, `${COMPLETE} was read and answered nothing, so a green run proves nothing`);
});

test('a witness restating a slot value demonstrates no reach', () => {
  const problems = restatedInWitness(
    '[data-arena-part="card.title"] { font-family: var(--ff-heading); }',
    () => '.arena-card__title { font-family: var(--ff-heading); }',
  );
  assert.equal(problems.length, 1, 'the value the slot already paints is the whole of that rule');
  assert.match(problems[0] ?? '', /card\.title/);
});

test('a witness painting a value of its own is what coverage means', () => {
  assert.deepEqual(restatedInWitness(
    '[data-arena-part="card.title"] { font-family: var(--font-mono); }',
    () => '.arena-card__title { font-family: var(--ff-heading); }',
  ), []);
});

test('every part the manifests emit resolves to a compiled sheet, or the rule reads nothing', () => {
  const sheets = sheetsByPart();
  assert.ok(sheets.size > 0, 'no part mapped to a sheet, so the witness would be measured against nothing');
  assert.ok(sheets.has('card.title'), 'a part every layer draws must resolve, or the map is partial');
});

test('the witness exemption covers hue-danger-fill-strong and goes stale once complete moves it', () => {
  assert.deepEqual(unreachedRoles(['hue-danger-fill-strong'], [], [...WITNESS_EXEMPT.keys()]), []);
  const stale = staleExemptions(['hue-danger-fill-strong']);
  assert.equal(stale.length, 1);
  assert.match(stale[0] ?? '', /hue-danger-fill-strong/);
  assert.deepEqual(staleExemptions([]), []);
});

const SHIPPED_SLOTS = readColorSlots().slots;
const EXEMPT_SLOTS = [...WITNESS_EXEMPT.keys()].filter((name) => Object.hasOwn(SHIPPED_SLOTS, name));

const answers = (file: string) => answersIn(readJson(join(repoRoot, file)) as Record<string, { $value?: unknown }>);

const fixture = (slots: SlotCatalogue['slots']): SlotCatalogue =>
  ({ accepts: { fill: [], ink: [], edge: [], icon: [] }, refused: [], states: [], groups: { button: { parts: ['root'] } }, members: {}, rings: {}, slots });

const part = { group: 'button', option: 'primary', part: 'root', accepts: 'ink' } as const;

test('complete answers every slot with a spelling of its own', () => {
  const unanswered = unansweredSlots(readColorSlots(), answers('plugin-style-store/complete/plugin.tokens.json'),
    answers(ROOT_PLUGIN));
  assert.deepEqual(unanswered, []);
  const given = answers('plugin-style-store/complete/plugin.tokens.json');
  for (const slot of EXEMPT_SLOTS) assert.equal(given[slot], undefined, `${slot} is exempt and complete leaves it unanswered`);
});

test('a slot no accepted role can answer as complete paints it is exempt, never answered with a palette key', () => {
  const given = answers('plugin-style-store/complete/plugin.tokens.json');
  for (const slot of ['choices-mark-ink-selected', 'navigation-badge-ink-selected', 'steps-current-marker-ink-rest', 'steps-current-marker-edge-rest']) {
    assert.ok(WITNESS_EXEMPT.has(slot), `${slot} is exempt`);
    assert.equal(given[slot], undefined, `${slot} is left unanswered`);
  }
});

test('a slot complete answers as default does fails', () => {
  const ink = (option: string, state: 'rest' | 'hover') => ({ ...part, option, property: 'ink', state, default: '{ink-body}' }) as const;
  const catalogue = fixture({
    'button-a-root-ink-rest': ink('a', 'rest'),
    'button-b-root-ink-rest': ink('b', 'rest'),
    'button-c-root-ink-rest': ink('c', 'rest'),
    'button-e-root-ink-rest': ink('e', 'rest'),
    'button-a-root-icon-rest': { ...part, option: 'a', property: 'icon', state: 'rest', default: '{button-a-root-ink-rest}' },
  });
  const complete = {
    'button-a-root-ink-rest': JSON.stringify('{ink-muted}'), 'button-b-root-ink-rest': JSON.stringify('{ink-body}'),
    'button-c-root-ink-rest': JSON.stringify('{ink-eyebrow}'), 'button-a-root-icon-rest': JSON.stringify('{ink-muted}'),
  };
  const root = { 'button-c-root-ink-rest': JSON.stringify('{ink-eyebrow}') };
  const problems = unansweredSlots(catalogue, complete, root);
  assert.equal(problems.length, 4);
  assert.match(problems[0] ?? '', /button-a-root-icon-rest.*ink the icon follows/);
  assert.match(problems[1] ?? '', /button-b-root-ink-rest.*kernel default/);
  assert.match(problems[2] ?? '', /button-c-root-ink-rest.*default plugin/);
  assert.match(problems[3] ?? '', /button-e-root-ink-rest.*unanswered/);
  assert.equal(unansweredSlots(catalogue, complete, root, new Map([['button-e-root-ink-rest', 'no second spelling']])).length, 3);
});

test('the slot exemption is listed in WITNESS_EXEMPT, and goes stale once complete moves it', () => {
  for (const slot of EXEMPT_SLOTS) assert.ok(WITNESS_EXEMPT.has(slot), `${slot} is exempt`);
  const stale = staleExemptions([...EXEMPT_SLOTS]);
  assert.equal(stale.length, EXEMPT_SLOTS.length);
  assert.deepEqual(staleExemptions([]), []);
});
