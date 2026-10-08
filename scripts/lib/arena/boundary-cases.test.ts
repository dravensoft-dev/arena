/* The verdict over what a render placed where, asserted on plain data, since scripts/ runs
 * without a DOM. Rendering is each layer's suite; this is the rule both apply: a probe's parent
 * is a boundary, or the nearest part is a slot its manifest declares transparent. The second
 * half holds the derivation to the contracts and the demo fixtures. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  siteProblems, staleTransparentProblems, boundaryCases, slotMembers, separateProblems, PROBE, type BoundaryCase,
} from './boundary-cases.ts';

const kase: BoundaryCase = {
  component: 'ArenaTooltip', label: 'ArenaTooltip', manifest: 'ArenaTooltip', slots: ['content'], node: { component: 'ArenaTooltip' },
  transparent: { root: 'the trigger is the adopter\'s control' }, slotOfPart: { tooltip: 'root', 'tooltip.bubble': 'bubble' },
};

test('a probe whose parent is a boundary passes', () => {
  assert.deepEqual(siteProblems({ ...kase, transparent: {} }, [{ slot: 'content', found: true, boundary: true, part: 'tooltip' }], 'react').problems, []);
});

test('a probe whose parent is no boundary fails, naming the slot and the part, which is the missing-boundary mutation', () => {
  const { problems } = siteProblems({ ...kase, transparent: {} },
    [{ slot: 'content', found: true, boundary: false, part: 'tooltip' }], 'react');
  assert.match(problems[0] ?? '', /react\/ArenaTooltip\.content projects into part "tooltip", which carries no data-arena-boundary/);
});

test('a boundary on a slot the manifest declares transparent fails, which is the contradiction mutation', () => {
  const { problems, spent } = siteProblems(kase, [{ slot: 'content', found: true, boundary: true, part: 'tooltip' }], 'angular');
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /angular\/ArenaTooltip\.content projects into part "tooltip", declared transparent in the manifest yet carrying data-arena-boundary: remove one of them/);
  assert.deepEqual(spent, []);
});

test('a probe inside a transparent slot passes and spends that entry', () => {
  const { problems, spent } = siteProblems(kase, [{ slot: 'content', found: true, boundary: false, part: 'tooltip' }], 'angular');
  assert.deepEqual(problems, []);
  assert.deepEqual(spent, ['ArenaTooltip.root']);
});

test('a probe rendered nowhere fails, since a slot the fixture never opens is a slot nothing measured', () => {
  assert.match(siteProblems(kase, [{ slot: 'content', found: false, boundary: false, part: null }], 'react').problems[0] ?? '',
    /rendered nowhere/);
});

test('a transparent entry no render spent is stale', () => {
  assert.match(staleTransparentProblems([kase], new Set(), 'react')[0] ?? '', /ArenaTooltip\.root is declared transparent and no slot/);
  assert.deepEqual(staleTransparentProblems([kase], new Set(['ArenaTooltip.root']), 'react'), []);
});

test('a slot member is a slot without parameters', () => {
  assert.deepEqual(slotMembers({ api: { content: { form: 'slot' }, label: { form: 'primitive' }, row: { form: 'slot', params: { item: 'x' } } } }), ['content']);
});

test('every contracted slot gets a case with its probe in place of the fixture\'s own content', () => {
  const cases = boundaryCases();
  assert.ok(cases.length > 0, 'derived no case at all; an empty sweep is a failure, not a clean pass');
  const button = cases.find((one) => one.component === 'ArenaButton');
  assert.ok(JSON.stringify(button?.node).includes(`"${PROBE}":"content"`));
});

test('a slot measured on its own gets a case of its own, seeded and pressed as its entry says', () => {
  const cases = boundaryCases();
  const ring = cases.find((one) => one.label === 'ArenaProgressBar (content)');
  assert.deepEqual(ring?.slots, ['content']);
  assert.equal((ring?.node.members ?? {}).shape, 'radial');
  const fallback = cases.find((one) => one.label === 'ArenaFigure (fallback)');
  assert.equal(JSON.stringify(fallback?.node).includes('"media"'), false);
  const event = cases.find((one) => one.label === 'ArenaCalendarEvent (actions)');
  assert.ok(event?.press);
  assert.ok(!cases.find((one) => one.label === 'ArenaFigure')?.slots.includes('fallback'));
});

test('a separate entry naming no contracted slot is stale', () => {
  assert.match(separateProblems(new Map([['ArenaFigure.nothing', { why: 'w' }]]), new Map([['ArenaFigure', { api: { media: { form: 'slot' } } }]])).join('\n'),
    /SEPARATE: ArenaFigure\.nothing is no contracted slot/);
});
