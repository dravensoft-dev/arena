/* The gate reads the real arrangements, which cover everything today by construction; these
 * drive its pure functions with the shrinkage a real edit would produce. Every case below is a
 * way check:pixel-parity keeps passing over a smaller surface without saying so. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PINNED, coverageProblems, pinnedProblems, emissionProblems, variantNames,
} from './check-kitchen-sink.ts';
import type { SinkFixture } from '../../lib/arena/kitchen-sink-model.ts';

const REGISTRY = ['ArenaBadge', 'ArenaButton', 'ArenaCard'];

const full = (sink: string): [string, SinkFixture] => [sink, {
  sink,
  sections: [{ title: 'All', items: [...REGISTRY] }],
}];

test('an arrangement holding every component the registry names reports nothing', () => {
  assert.deepEqual(coverageProblems(new Map([full('default')]), REGISTRY), []);
});

test('a component no arrangement places is named, because nothing would compare it', () => {
  const problems = coverageProblems(
    new Map([['default', { sink: 'default', sections: [{ title: 'All', items: ['ArenaBadge'] }] }]]),
    REGISTRY,
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /ArenaButton, ArenaCard/);
});

test('an empty arrangement fails rather than comparing two empty documents', () => {
  const problems = coverageProblems(
    new Map([['default', { sink: 'default', sections: [] }]]), REGISTRY,
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /no component at all/);
});

test('a name the registry does not carry fails, since a typo silently drops a component', () => {
  const problems = coverageProblems(
    new Map([['default', { sink: 'default', sections: [{ title: 'All', items: [...REGISTRY, 'ArenaBaged'] }] }]]),
    REGISTRY,
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /ArenaBaged/);
});

test('a component placed twice fails, because the second copy is a section that lost its subject', () => {
  const problems = coverageProblems(
    new Map([['default', { sink: 'default', sections: [{ title: 'All', items: [...REGISTRY, 'ArenaCard'] }] }]]),
    REGISTRY,
  );
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /more than once/);
});

test('PINNED names a real fixture, and an entry whose component stopped needing it goes stale loudly', () => {
  assert.ok(Object.keys(PINNED).length > 0, 'an empty map holds nothing and passes over everything');
  for (const { members, reason } of Object.values(PINNED)) {
    assert.ok(members.length > 0, 'an entry naming no member pins nothing');
    assert.ok(reason.trim().length > 40, 'the reason is the whole entry');
  }
  const seeded = new Map([['ArenaCalendar', { seed: { anchorDate: '2026-03-16', timeZone: 'Europe/Madrid' } }]]);
  assert.deepEqual(pinnedProblems(seeded), []);
});

test('a fixture that stops pinning a member fails, since the clock would then move the page', () => {
  const problems = pinnedProblems(new Map([['ArenaCalendar', { seed: { anchorDate: '2026-03-16' } }]]));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /does not seed timeZone/);
});

test('an entry for a component with no fixture at all is reported as the stale allowance it is', () => {
  const problems = pinnedProblems(new Map(), { ArenaGhost: { members: ['x'], reason: 'a'.repeat(50) } });
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /outlived what it was written for/);
});

test('an emitted page that is not a fresh run of the generator fails rather than being compared', () => {
  const problems = emissionProblems(new Map([['frameworks/react/kitchen-sink/none/index.generated.html', 'moved']]));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /edited by hand|is not on disk/);
});

const VARIANTS = new Map([['ArenaGaugeChart', ['at-min', 'no-bands']], ['ArenaSparkline', ['flat']]]);

const drawn = (...items: string[]): Map<string, SinkFixture> =>
  new Map([['charts', { sink: 'charts', sections: [{ title: 'Charts', items }] }]]);

test('an arrangement of variants needs no registry component and every variant a demo declares', () => {
  const all = ['ArenaGaugeChart:at-min', 'ArenaGaugeChart:no-bands', 'ArenaSparkline:flat'];
  assert.deepEqual(coverageProblems(drawn(...all), REGISTRY, VARIANTS), []);
});

test('a variant no arrangement places is named, because nothing would compare it', () => {
  const problems = coverageProblems(drawn('ArenaGaugeChart:at-min', 'ArenaSparkline:flat'), REGISTRY, VARIANTS);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /ArenaGaugeChart:no-bands/);
  assert.match(problems[0] ?? '', /in no variant arrangement/);
});

test('the variants may be split across arrangements of variants, each drawn in one of them', () => {
  const split = new Map<string, SinkFixture>([
    ['charts', { sink: 'charts', sections: [{ title: 'Charts', items: ['ArenaGaugeChart:at-min', 'ArenaGaugeChart:no-bands'] }] }],
    ['palettes', { sink: 'palettes', sections: [{ title: 'Palettes', items: ['ArenaSparkline:flat'] }] }],
  ]);
  assert.deepEqual(coverageProblems(split, REGISTRY, VARIANTS), []);
  split.delete('palettes');
  const problems = coverageProblems(split, REGISTRY, VARIANTS);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /ArenaSparkline:flat/);
});

test('a variant drawn in two variant arrangements fails, since it is to be drawn once', () => {
  const twice = new Map<string, SinkFixture>([
    ['charts', { sink: 'charts', sections: [{ title: 'Charts', items: ['ArenaGaugeChart:at-min', 'ArenaGaugeChart:no-bands', 'ArenaSparkline:flat'] }] }],
    ['palettes', { sink: 'palettes', sections: [{ title: 'Palettes', items: ['ArenaSparkline:flat'] }] }],
  ]);
  const problems = coverageProblems(twice, REGISTRY, VARIANTS);
  assert.equal(problems.length, 2, 'each of the two arrangements names the variant');
  assert.match(problems.join('\n'), /ArenaSparkline:flat, which another variant arrangement also draws/);
});

test('a variant no demo declares fails, since a typo silently draws one tile fewer', () => {
  const problems = coverageProblems(drawn('ArenaGaugeChart:at-min', 'ArenaGaugeChart:no-bands',
    'ArenaSparkline:flat', 'ArenaSparkline:typo'), REGISTRY, VARIANTS);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /ArenaSparkline:typo, which no demo declares/);
});

test('a variant placed twice fails', () => {
  const problems = coverageProblems(drawn('ArenaGaugeChart:at-min', 'ArenaGaugeChart:at-min',
    'ArenaGaugeChart:no-bands', 'ArenaSparkline:flat'), REGISTRY, VARIANTS);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /places ArenaGaugeChart:at-min more than once/);
});

test('a variant beside whole components fails, since the registry rule and the variant rule need one arrangement each', () => {
  const mixed = new Map<string, SinkFixture>([['default', {
    sink: 'default', sections: [{ title: 'All', items: [...REGISTRY, 'ArenaGaugeChart:at-min'] }],
  }]]);
  const problems = coverageProblems(mixed, REGISTRY, VARIANTS);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /a variant, beside whole components/);
});

test('the variants a demo declares are read by component, and a demo with none is absent', () => {
  const names = variantNames(new Map([
    ['ArenaGaugeChart', { variants: { 'at-min': {}, 'no-bands': {} } }], ['ArenaBadge', {}],
  ]));
  assert.deepEqual([...names], [['ArenaGaugeChart', ['at-min', 'no-bands']]]);
});
