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

test('PINNED names a real fixture, and an entry whose component stopped needing it goes stale loudly', () => {
  assert.ok(Object.keys(PINNED).length > 0, 'an empty map holds nothing and passes over everything');
  for (const { members, reason } of Object.values(PINNED)) {
    assert.ok(members.length > 0, 'an entry naming no member pins nothing');
    assert.ok(reason.trim().length > 40, 'the reason is the whole entry');
  }
  const seeded = new Map([['ArenaCalendar', { seed: { anchorDate: '2026-03-16', timeZone: 'Europe/Madrid' } }]]);
  assert.deepEqual(pinnedProblems(seeded), []);
});

test('a fixture that stops pinning a member, and an entry for a component with no fixture, both fail', () => {
  const rows: { name: string; fixtures: Map<string, { seed: Record<string, string> }>; pinned?: Record<string, { members: string[]; reason: string }>; pattern: RegExp }[] = [
    { name: 'a fixture that stops pinning a member fails, since the clock would then move the page',
      fixtures: new Map([['ArenaCalendar', { seed: { anchorDate: '2026-03-16' } }]]), pattern: /does not seed timeZone/ },
    { name: 'an entry for a component with no fixture at all is reported as the stale allowance it is',
      fixtures: new Map(), pinned: { ArenaGhost: { members: ['x'], reason: 'a'.repeat(50) } }, pattern: /outlived what it was written for/ },
  ];
  for (const row of rows) {
    const problems = pinnedProblems(row.fixtures, row.pinned);
    assert.equal(problems.length, 1, `${row.name}: finding count`);
    assert.match(problems[0] ?? '', row.pattern, row.name);
  }
});

test('an emitted page that is not a fresh run of the generator fails rather than being compared', () => {
  const problems = emissionProblems(new Map([['frameworks/react/kitchen-sink/none/index.generated.html', 'moved']]));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /edited by hand|is not on disk/);
});

const VARIANTS = new Map([['ArenaGaugeChart', ['at-min', 'no-bands']], ['ArenaSparkline', ['flat']]]);

const drawn = (...items: string[]): Map<string, SinkFixture> =>
  new Map([['charts', { sink: 'charts', sections: [{ title: 'Charts', items }] }]]);

const one = (sink: string, title: string, items: string[]): [string, SinkFixture] => [sink, { sink, sections: [{ title, items }] }];

test('coverageProblems names every way an arrangement drops, doubles or invents a component or a variant', () => {
  const rows: { name: string; fixtures: () => Map<string, SinkFixture>; variants?: Map<string, string[]>; count: number; patterns: RegExp[]; why?: string }[] = [
    { name: 'an arrangement holding every component the registry names reports nothing',
      fixtures: () => new Map([full('default')]), count: 0, patterns: [] },
    { name: 'a component no arrangement places is named, because nothing would compare it',
      fixtures: () => new Map([one('default', 'All', ['ArenaBadge'])]), count: 1, patterns: [/ArenaButton, ArenaCard/] },
    { name: 'an empty arrangement fails rather than comparing two empty documents',
      fixtures: () => new Map([['default', { sink: 'default', sections: [] }]]), count: 1, patterns: [/no component at all/] },
    { name: 'a name the registry does not carry fails, since a typo silently drops a component',
      fixtures: () => new Map([one('default', 'All', [...REGISTRY, 'ArenaBaged'])]), count: 1, patterns: [/ArenaBaged/] },
    { name: 'a component placed twice fails, because the second copy is a section that lost its subject',
      fixtures: () => new Map([one('default', 'All', [...REGISTRY, 'ArenaCard'])]), count: 1, patterns: [/more than once/] },
    { name: 'an arrangement of variants needs no registry component and every variant a demo declares',
      fixtures: () => drawn('ArenaGaugeChart:at-min', 'ArenaGaugeChart:no-bands', 'ArenaSparkline:flat'), variants: VARIANTS, count: 0, patterns: [] },
    { name: 'a variant no arrangement places is named, because nothing would compare it',
      fixtures: () => drawn('ArenaGaugeChart:at-min', 'ArenaSparkline:flat'), variants: VARIANTS, count: 1,
      patterns: [/ArenaGaugeChart:no-bands/, /in no variant arrangement/] },
    { name: 'the variants may be split across arrangements of variants, each drawn in one of them',
      fixtures: () => new Map([
        one('charts', 'Charts', ['ArenaGaugeChart:at-min', 'ArenaGaugeChart:no-bands']),
        one('palettes', 'Palettes', ['ArenaSparkline:flat']),
      ]), variants: VARIANTS, count: 0, patterns: [] },
    { name: 'a split arrangement missing one of its arrangements names the variant it lost',
      fixtures: () => new Map([one('charts', 'Charts', ['ArenaGaugeChart:at-min', 'ArenaGaugeChart:no-bands'])]),
      variants: VARIANTS, count: 1, patterns: [/ArenaSparkline:flat/] },
    { name: 'a variant drawn in two variant arrangements fails, since it is to be drawn once',
      fixtures: () => new Map([
        one('charts', 'Charts', ['ArenaGaugeChart:at-min', 'ArenaGaugeChart:no-bands', 'ArenaSparkline:flat']),
        one('palettes', 'Palettes', ['ArenaSparkline:flat']),
      ]), variants: VARIANTS, count: 2, patterns: [/ArenaSparkline:flat, which another variant arrangement also draws/],
      why: 'each of the two arrangements names the variant' },
    { name: 'a variant no demo declares fails, since a typo silently draws one tile fewer',
      fixtures: () => drawn('ArenaGaugeChart:at-min', 'ArenaGaugeChart:no-bands', 'ArenaSparkline:flat', 'ArenaSparkline:typo'),
      variants: VARIANTS, count: 1, patterns: [/ArenaSparkline:typo, which no demo declares/] },
    { name: 'a variant placed twice fails',
      fixtures: () => drawn('ArenaGaugeChart:at-min', 'ArenaGaugeChart:at-min', 'ArenaGaugeChart:no-bands', 'ArenaSparkline:flat'),
      variants: VARIANTS, count: 1, patterns: [/places ArenaGaugeChart:at-min more than once/] },
    { name: 'a variant beside whole components fails, since the registry rule and the variant rule need one arrangement each',
      fixtures: () => new Map([one('default', 'All', [...REGISTRY, 'ArenaGaugeChart:at-min'])]),
      variants: VARIANTS, count: 1, patterns: [/a variant, beside whole components/] },
  ];
  for (const row of rows) {
    const problems = coverageProblems(row.fixtures(), REGISTRY, row.variants);
    assert.equal(problems.length, row.count, `${row.name}: finding count${row.why ? ` (${row.why})` : ''}`);
    for (const pattern of row.patterns) assert.match(row.count === 2 ? problems.join('\n') : problems[0] ?? '', pattern, `${row.name}: ${pattern}`);
  }
});

test('the variants a demo declares are read by component, and a demo with none is absent', () => {
  const names = variantNames(new Map([
    ['ArenaGaugeChart', { variants: { 'at-min': {}, 'no-bands': {} } }], ['ArenaBadge', {}],
  ]));
  assert.deepEqual([...names], [['ArenaGaugeChart', ['at-min', 'no-bands']]]);
});
