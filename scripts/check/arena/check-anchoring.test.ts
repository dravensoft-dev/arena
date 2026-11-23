/* The gate drives a real browser; these drive its verdict with the readings a placed panel and
 * a clipped one produce. The in-flow panel is the case that shipped: absolutely positioned under
 * its trigger, it opened below the bottom edge and was cut off by the first overflow: hidden
 * ancestor, and every DOM-free suite passed because happy-dom has no layout to clip it with. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ANCHORED, MOUNTED, OPENED, alikeProblems, anchoringProblems, caseUrl, confineExpression, directionScript, initScripts, readExpression, scrollExpression,
  settleExpression, SETTLED, smallestRow, visualViewportScript, type Anchored, type Reading,
} from './check-anchoring.ts';
import { SCOPES } from './check-target-size.ts';

const below: Anchored = { name: 'X:react', page: 'p.html', trigger: '[aria-haspopup]', panel: '[role="dialog"]', open: 'click', prefer: 'below' };
const above: Anchored = { ...below, name: 'Y:react', open: 'focus', prefer: 'above' };

test('the table names both layers for every component it holds, or the sweep proves half of what it claims', () => {
  const names = ANCHORED.map((kase) => kase.name);
  for (const name of names) {
    const [component] = name.split(':');
    assert.ok(names.includes(`${component}:react`) && names.includes(`${component}:angular`), `${component} is opened in one layer only`);
  }
  assert.equal(new Set(names).size, names.length, 'a case is declared twice');
});

test('the read measures the rows in every scope the target-size gate declares, and a case with no rows measures none', () => {
  const list: Anchored = { ...below, name: 'Z:react', rows: '[role="option"]' };
  assert.match(readExpression(list), /"scope":"base","klass":"","floor":24/);
  assert.match(readExpression(list), /"scope":"comfortable","klass":"arena-comfortable","floor":44/);
  assert.match(readExpression(list), /"scope":"compact","klass":"arena-compact","floor":24/);
  assert.match(readExpression(below), /const rows = "" \?/);
});

test('the smallest row is the least height, and none is zero', () => {
  assert.equal(smallestRow([48, 37, 52]), 37);
  assert.equal(smallestRow([40]), 40);
  assert.equal(smallestRow([]), 0);
});

test('the read runs: the smallest row per scope, and each scope class put back', () => {
  const list: Anchored = { ...below, name: 'Z:react', rows: '[role="option"]' };
  const classes = new Set<string>(['arena-compact']);
  const box = (top: number, height: number) => ({ top, bottom: top + height, left: 0, right: 100, height });
  const rowHeights = () => (classes.has('arena-comfortable') ? [48, 44, 50] : [30, 26, 40]);
  const panel = { getBoundingClientRect: () => box(0, 100), contains: () => true };
  const fake = {
    body: { classList: { add: (one: string) => classes.add(one), remove: (one: string) => classes.delete(one) } },
    querySelector: (selector: string) => (selector === list.panel ? panel : { getBoundingClientRect: () => box(200, 20) }),
    querySelectorAll: () => rowHeights().map((height) => ({ getBoundingClientRect: () => ({ height }) })),
    elementFromPoint: () => panel,
  };
  const read = new Function('document', 'innerWidth', 'innerHeight', `return ${readExpression(list)}`)(fake, 1000, 760);
  assert.deepEqual(read.rows.map((row: { scope: string; smallest: number }) => [row.scope, row.smallest]),
    [['base', 26], ['comfortable', 44], ['compact', 26]]);
  assert.deepEqual([...classes], [], 'neither scope class is left on the body');
});

test('the stage is pinned to the edge the panel prefers, so the panel has to flip away from it', () => {
  assert.match(confineExpression(below), /bottom: '8px'/);
  assert.match(confineExpression(above), /top: '8px'/);
  assert.match(confineExpression(below), /overflow: 'hidden', transform: 'translateZ\(0\)'/);
});

const aligned: Anchored = { ...below, name: 'W:react', edge: { anchor: '[data-whole]', align: 'start' }, seed: 'align=start' };
const placedWhole = { mounted: true, opened: true, painted: true, inside: true, side: 'above' as const };

function readEdge(kase: Anchored, panelLeft: number) {
  const panel = { getBoundingClientRect: () => ({ left: panelLeft, right: panelLeft + 200, top: 0, bottom: 80, width: 200, height: 80 }), contains: () => true };
  const boxes: Record<string, { left: number; right: number }> = { '[data-whole]': { left: 16, right: 157 }, '[data-caret]': { left: 117, right: 157 } };
  const fake = {
    querySelector: (selector: string) => (selector === kase.panel ? panel
      : { getBoundingClientRect: () => ({ ...(boxes[selector] ?? { left: 117, right: 157 }), top: 100, bottom: 140 }) }),
    querySelectorAll: () => [],
    elementFromPoint: () => panel,
    body: { classList: { add() {}, remove() {} } },
  };
  return new Function('document', 'innerWidth', 'innerHeight', `return ${readExpression(kase)}`)(fake, 1000, 760).edge;
}

test('the read measures the aligned edge from the named anchor, the clamp to the viewport included', () => {
  assert.deepEqual(readEdge(aligned, 7), { wanted: 16, actual: 7 });
  assert.deepEqual(readEdge({ ...aligned, edge: { anchor: '[data-whole]', align: 'end' } }, 7), { wanted: 0, actual: 7 });
  assert.deepEqual(readEdge({ ...aligned, edge: { anchor: '[data-caret]', align: 'start' } }, 7), { wanted: 117, actual: 7 });
});

test('a seeded case opens its page with the seed as the query, and an unseeded one with none', () => {
  assert.equal(caseUrl('http://h', aligned), 'http://h/p.html?align=start');
  assert.equal(caseUrl('http://h', below), 'http://h/p.html');
});

test('the split\'s panel is measured from the start edge of the whole split, in both layers, seeded there', () => {
  const split = ANCHORED.filter((kase) => /^ArenaSplitButton:(react|angular)$/.test(kase.name));
  assert.equal(split.length, 2);
  for (const kase of split) {
    assert.deepEqual(kase.edge, { anchor: '[data-arena-part="split-button"]', align: 'start' }, kase.name);
    assert.equal(kase.seed, 'align=start', `${kase.name} measures start without seeding it, so the demo's end is what opens`);
  }
});

test('an aligned panel is pinned to each horizontal edge in both layers, for the split and the menu', () => {
  const pinned = ANCHORED.filter((kase) => kase.pin !== undefined && kase.width === undefined);
  assert.deepEqual(pinned.map((kase) => kase.name).sort(), ['ArenaMenu', 'ArenaSplitButton'].flatMap((component) => ['react', 'angular']
    .flatMap((layer) => ['end-at-start', 'start-at-end'].map((kind) => `${component}:${layer}:${kind}`))).sort());
  for (const kase of pinned) {
    const [, , kind] = kase.name.split(':');
    assert.equal(kase.pin, kind === 'end-at-start' ? 'start' : 'end', kase.name);
    assert.equal(kase.edge?.align, kase.pin, `${kase.name} measures the edge the panel flips to, which is the pinned one`);
  }
});

test('a menu that fits neither alignment is opened in both layers, in a viewport the panel nearly fills', () => {
  const narrow = ANCHORED.filter((kase) => kase.width !== undefined);
  assert.deepEqual(narrow.map((kase) => kase.name).sort(), ['ArenaMenu:angular:fits-neither', 'ArenaMenu:react:fits-neither']);
  for (const kase of narrow) {
    assert.equal(kase.pin, 'end', kase.name);
    assert.equal(kase.seed, 'align=start', `${kase.name} asks for the alignment that overflows more`);
    assert.equal(kase.edge?.align, 'end', `${kase.name} measures the alignment that overflows less, which is the one clamped`);
  }
});

test('a pinned stage lines its trigger against the edge it names', () => {
  assert.match(confineExpression({ ...below, pin: 'start' }), /justifyContent: 'flex-start'/);
  assert.match(confineExpression({ ...below, pin: 'end' }), /justifyContent: 'flex-end'/);
  assert.doesNotMatch(confineExpression(below), /justifyContent/);
});

const rtl: Anchored = { ...aligned, name: 'R:react:rtl-start', rtl: true, centred: true, alike: true, seed: 'align=start' };

test('a right-to-left case reads start as the anchor\'s right edge, and the problem names the direction', () => {
  assert.deepEqual(readEdge(rtl, 7), { wanted: 0, actual: 7 }, 'rtl start lines the panel\'s right edge up with the anchor\'s, clamped at the page edge');
  const end = { ...rtl, edge: { anchor: '[data-whole]', align: 'end' as const } };
  assert.deepEqual(readEdge(end, 7), { wanted: 16, actual: 7 }, 'rtl end lines up with the anchor\'s left edge');
  const off = anchoringProblems(rtl, { ...placedWhole, edge: { wanted: 16, actual: 117 } });
  assert.match(off[0] ?? '', /its start edge in a right-to-left page measured from \[data-whole\]/);
});

test('a right-to-left case centres the trigger and sets the direction before the page runs', () => {
  assert.match(confineExpression(rtl), /justifyContent: 'center'/);
  assert.deepEqual(initScripts(rtl), [directionScript()]);
  assert.match(directionScript(), /MutationObserver/);
  assert.match(directionScript(), /setAttribute\('dir', 'rtl'\)/);
  assert.deepEqual(initScripts(below), []);
});

const keyboard: Anchored = { ...below, name: 'K:react:keyboard-200', visual: { top: 200, height: 440 }, alike: true };

test('a keyboard case stubs the visual viewport, pins the trigger to the bottom of the visible box, and reads inside that box', () => {
  assert.match(visualViewportScript(keyboard.visual!), /offsetTop: \{ get: \(\) => 200 \}/);
  assert.match(visualViewportScript(keyboard.visual!), /height: \{ get: \(\) => 440 \}/);
  assert.deepEqual(initScripts(keyboard), [visualViewportScript(keyboard.visual!)]);
  assert.match(confineExpression(keyboard), /top: \(640 - tall - 8\) \+ 'px'/);
  assert.match(confineExpression({ ...keyboard, prefer: 'above' }), /top: '208px'/);
  assert.match(readExpression(keyboard), /\{"top":200,"height":440\}/);
});

test('React and Angular must place a case alike within a pixel, and one reading missing is a failure', () => {
  const angular: Anchored = { ...keyboard, name: 'K:angular:keyboard-200' };
  const at = (left: number, top: number): Reading => ({ ...placedWhole, rect: { left, top, width: 100, height: 80 } });
  const cases = [keyboard, angular];
  assert.deepEqual(alikeProblems(new Map([[keyboard.name, at(10, 20)], [angular.name, at(10.9, 19.2)]]), cases), []);
  const apart = alikeProblems(new Map([[keyboard.name, at(10, 20)], [angular.name, at(10, 25)]]), cases);
  assert.equal(apart.length, 1);
  assert.match(apart[0] ?? '', /React and Angular place the panel apart by more than 1px in top \(20 against 25\)/);
  assert.match(alikeProblems(new Map([[keyboard.name, at(10, 20)]]), cases)[0] ?? '', /no panel rect was read in Angular/);
});

test('every logical and keyboard case is declared in both layers, flagged alike, and covers start and end', () => {
  const logical = ANCHORED.filter((kase) => kase.rtl !== undefined);
  assert.deepEqual(logical.map((kase) => kase.name).sort(), ['ArenaMenu', 'ArenaSplitButton'].flatMap((component) => ['react', 'angular']
    .flatMap((layer) => ['rtl-start', 'rtl-end'].map((kind) => `${component}:${layer}:${kind}`))).sort());
  for (const kase of logical) assert.equal(kase.edge?.align, kase.name.endsWith('start') ? 'start' : 'end', kase.name);
  const boxes = ANCHORED.filter((kase) => kase.visual !== undefined);
  assert.deepEqual([...new Set(boxes.map((kase) => kase.visual?.top))].sort(), [0, 200]);
  for (const kase of [...logical, ...boxes]) assert.ok(kase.alike, `${kase.name} is not compared across layers`);
});

const crowded = (crowd: 'offset' | 'floor'): Anchored => ({ ...below, name: `K:react:keyboard-${crowd}`, visual: { top: 200, height: 100 }, crowd });
const settled = { mounted: true, opened: true, painted: true, inside: true } as const;

test('the crowded cases scroll the panel, place it again through the stubbed visual viewport, and read it back', () => {
  assert.match(scrollExpression(crowded('floor')), /scrollTop = 10[\s\S]*dispatchEvent\(new Event\('resize'\)\)[\s\S]*kept/);
  const names = ANCHORED.filter((kase) => kase.crowd !== undefined).map((kase) => kase.name);
  assert.equal(names.length, 12);
  assert.ok(names.some((name) => name.startsWith('ArenaCombobox:angular:') && name.endsWith('floor')));
});

test('anchoringProblems passes a panel placed whole, and names each way a panel is clipped, unflipped, unmounted, unopened, misaligned, outside the visual box, uncapped or unsettled', () => {
  const rows: { name: string; kase: Anchored; reading: Reading; count?: number; patterns?: RegExp[]; notPatterns?: RegExp[]; why?: string }[] = [
    { name: 'a panel placed whole and flipped away from the edge passes (below)', kase: below, count: 0,
      reading: { mounted: true, opened: true, painted: true, inside: true, side: 'above' } },
    { name: 'a panel placed whole and flipped away from the edge passes (above)', kase: above, count: 0,
      reading: { mounted: true, opened: true, painted: true, inside: true, side: 'below' } },
    { name: 'the in-flow panel fails three ways: clipped, out of the viewport, and never flipped', kase: below, count: 3,
      reading: { mounted: true, opened: true, painted: false, inside: false, side: 'below' },
      patterns: [/is not what paints at its own centre/, /leaves the viewport/, /opened below it rather than flipping above/] },
    { name: 'a panel that overlaps its trigger has not flipped either', kase: above,
      reading: { mounted: true, opened: true, painted: true, inside: true, side: 'overlapping' },
      patterns: [/opened overlapping it rather than flipping below/] },
    { name: 'a page that never mounted says which wait expired', kase: below, reading: { mounted: false, opened: false },
      patterns: [new RegExp(MOUNTED.name)] },
    { name: 'a trigger that opened nothing says which wait expired', kase: below, reading: { mounted: true, opened: false },
      patterns: [new RegExp(OPENED.name)] },
    { name: 'a panel whose aligned edge sits on the named anchor\'s passes', kase: aligned, count: 0,
      reading: { ...placedWhole, edge: { wanted: 16, actual: 16.5 } } },
    { name: 'a panel a pixel or more off its aligned edge fails', kase: aligned, count: 1,
      reading: { ...placedWhole, edge: { wanted: 16, actual: 117 } },
      patterns: [/starts at 117px, and its start edge measured from \[data-whole\] puts it at 16px/] },
    { name: 'a panel placed against the whole control passes', kase: aligned, count: 0, reading: { ...placedWhole, edge: readEdge(aligned, 16) } },
    { name: 'a panel placed against the caret instead of the whole control fails at start', kase: aligned, count: 1,
      reading: { ...placedWhole, edge: readEdge(aligned, 117) },
      why: 'a panel lined up with the caret passed as lined up with the whole control' },
    { name: 'a case naming an edge with no anchor to measure from fails rather than passing over nothing', kase: aligned, reading: placedWhole,
      patterns: [/no \[data-whole\] was found/] },
    { name: 'a panel outside the box a soft keyboard leaves fails, naming that box', kase: keyboard, count: 1,
      reading: { ...placedWhole, inside: false }, patterns: [/leaves the visual viewport \(200px to 640px\)/] },
    { name: 'a trigger just under the top of the visual viewport keeps the preferred side', kase: crowded('offset'), count: 0,
      reading: { ...settled, side: 'below' } },
    { name: 'a trigger just under the top of the visual viewport fails when its panel flips', kase: crowded('offset'),
      reading: { ...settled, side: 'above' }, patterns: [/counted from that top.*opened above it/] },
    { name: 'a panel with no row of room, capped, inside the box and keeping its scroll position, passes', kase: crowded('floor'), count: 0,
      reading: { ...settled, side: 'overlapping', scrolled: { capped: true, kept: true, wanted: 10, actual: 10 } } },
    { name: 'a panel with no row of room that is not capped fails', kase: crowded('floor'),
      reading: { ...settled, side: 'overlapping', scrolled: { capped: false, kept: true, wanted: 10, actual: 10 } }, patterns: [/not capped to scroll/] },
    { name: 'a panel with no row of room and no scroll reading fails', kase: crowded('floor'),
      reading: { ...settled, side: 'overlapping' }, patterns: [/not capped to scroll/] },
    { name: 'a panel with no row of room that loses its scroll position fails', kase: crowded('floor'),
      reading: { ...settled, side: 'overlapping', scrolled: { capped: true, kept: false, wanted: 10, actual: 0 } }, patterns: [/scrolled to 10px and was at 0px/] },
    { name: 'a panel with no row of room that leaves the visual box fails', kase: crowded('floor'),
      reading: { ...settled, inside: false, side: 'overlapping', scrolled: { capped: true, kept: true, wanted: 10, actual: 10 } },
      patterns: [/leaves the visual viewport/] },
    { name: 'a panel whose box never settles is reported as unsettled, not as unopened', kase: ANCHORED[0]!, count: 1,
      reading: { mounted: true, opened: true, unsettled: true }, patterns: [/still moving/], notPatterns: [/never opened/] },
  ];
  assert.ok(ANCHORED.length > 0, 'the table of cases is not empty');
  for (const row of rows) {
    const problems = anchoringProblems(row.kase, row.reading);
    if (row.count !== undefined) assert.equal(problems.length, row.count, `${row.name}: finding count${row.why ? ` (${row.why})` : ''}`);
    (row.patterns ?? []).forEach((pattern, index) => assert.match(problems[index] ?? '', pattern, `${row.name}: ${pattern}`));
    for (const pattern of row.notPatterns ?? []) assert.doesNotMatch(problems[0] ?? '', pattern, `${row.name}: ${pattern}`);
  }
});

test('a list is held to the floor of every scope: a short row fails in that scope alone, no rows or one scope fails, and a reading with rows for a case naming none is no list', () => {
  const list: Anchored = { ...below, name: 'Z:react', rows: '[role="option"]' };
  const placed = { mounted: true, opened: true, painted: true, inside: true, side: 'above' as const };
  const base = { scope: 'base', floor: 24, count: 3, smallest: 37 };
  const compact = { scope: 'compact', floor: 24, count: 3, smallest: 26 };
  const fewerScopes = SCOPES.slice(0, SCOPES.length - 1).map((s) => ({ scope: s.name, floor: s.floor, count: 2, smallest: 48 }));
  const at = (smallest: number) => [
    { scope: 'base', floor: 24, count: 3, smallest: 24 }, { scope: 'comfortable', floor: 44, count: 3, smallest },
    { scope: 'compact', floor: 24, count: 3, smallest: 24 },
  ];
  const rows: { name: string; kase: Anchored; rows: Reading['rows']; count?: number; pattern?: RegExp; includes?: string }[] = [
    { name: 'every scope above its floor passes', kase: list, count: 0,
      rows: [base, { scope: 'comfortable', floor: 44, count: 3, smallest: 48 }, compact] },
    { name: 'a list whose smallest row is under a scope\'s floor fails in that scope alone', kase: list, count: 1,
      rows: [base, { scope: 'comfortable', floor: 44, count: 3, smallest: 40 }, compact],
      pattern: /is 40px tall in the comfortable scope, and the floor there is 44px/ },
    { name: 'a list measured with no rows fails rather than passing over nothing', kase: list,
      rows: [{ scope: 'base', floor: 24, count: 0, smallest: 0 }, { scope: 'comfortable', floor: 44, count: 2, smallest: 48 }, { scope: 'compact', floor: 24, count: 2, smallest: 26 }],
      pattern: /drew no \[role="option"\] in the base scope/ },
    { name: 'a list measured in one scope fewer fails rather than passing over nothing', kase: list, count: 1, rows: fewerScopes,
      includes: `(${SCOPES.map((s) => s.name).join(', ')})` },
    { name: 'a compact row of 23px fails in compact alone', kase: list, count: 1,
      rows: SCOPES.map((s) => ({ scope: s.name, floor: s.floor, count: 2, smallest: s.name === 'compact' ? 23 : 48 })),
      pattern: /is 23px tall in the compact scope, and the floor there is 24px/ },
    { name: 'a row exactly at the floor passes', kase: list, count: 0, rows: at(44) },
    { name: 'a row a hair under the floor fails', kase: list, count: 1, rows: at(43.99) },
    { name: 'a reading that carries rows for a case naming none is not read as a list', kase: below, count: 0,
      rows: [{ scope: 'base', floor: 24, count: 0, smallest: 0 }] },
  ];
  for (const row of rows) {
    const problems = anchoringProblems(row.kase, { ...placed, rows: row.rows });
    if (row.count !== undefined) assert.equal(problems.length, row.count, `${row.name}: finding count`);
    if (row.pattern) assert.match(problems[0] ?? '', row.pattern, row.name);
    if (row.includes !== undefined) assert.ok(problems[0]?.includes(row.includes), `${row.name}: names ${row.includes}`);
  }
});

test('a panel frozen mid-entrance is read at rest, because the settle finishes every animation before it reads a box', async () => {
  let finished = false;
  const panel = { getBoundingClientRect: () => ({ left: 0, top: finished ? 562 : 558, width: 200, height: 120 }) };
  const page = {
    document: { querySelector: () => panel, getAnimations: () => [{ finish: () => { finished = true; } }] },
    requestAnimationFrame: (step: () => void) => { queueMicrotask(step); },
  };
  const settle = new Function('document', 'requestAnimationFrame', `return ${settleExpression(below, SETTLED)};`);
  assert.equal(await settle(page.document, page.requestAnimationFrame), true);
  assert.equal(finished, true, 'an entrance that never advances between two frames has to be finished, never waited out');
});
