import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, basename } from 'node:path';
import {
  componentMap, angularComponentMap, reactComponentMap, sheetOf, close, MAP_FILE,
  markerAttributes, MARKERS_FILE, reactSheetless, LAYER_IMPORT, QUERIED_MARKER,
} from './component-map.ts';
import { manifestFiles } from '../tailwind/tailwind-compile.ts';
import { kebab } from '../../utils/case.ts';
import { repoRoot } from './repo-root.ts';
import { captured } from '../../utils/captures.ts';

const shipped = manifestFiles(join(repoRoot, 'frameworks', 'tailwind', 'components'))
  .map((file) => kebab(basename(file).split('.')[0] ?? ''));

test('the file both packages carry the map as is named once', () => {
  assert.equal(MAP_FILE, 'components.json');
});

for (const [layer, match] of [['angular', 'selector'], ['react', 'symbol']] as [string, string][]) {
  test(`${layer} keys every component by what a consumer of that layer writes`, () => {
    const map = componentMap(layer, repoRoot);
    assert.equal(map.match, match);
    assert.ok(Object.keys(map.draws).length >= 50, `${Object.keys(map.draws).length} key(s) is not a whole library`);
  });

  test(`${layer} names no sheet this package does not ship`, () => {
    const map = componentMap(layer, repoRoot);
    const invented = [...new Set(Object.values(map.draws))]
      .filter((s): s is string => Boolean(s))
      .filter((s) => !shipped.includes(s));
    assert.deepEqual(invented, [], 'a name here fails the command it is written for, which is worse than no map');
  });

  test(`${layer} claims every sheet the package ships, so no component is unreachable by auto`, () => {
    const map = componentMap(layer, repoRoot);
    const claimed = new Set(Object.values(map.draws).filter(Boolean));
    assert.deepEqual(shipped.filter((s) => !claimed.has(s)), [],
      'a sheet no key resolves to can never enter a subset, and the component wearing it renders unstyled');
  });

  test(`${layer} closes what Arena draws for the consumer, and a table is the case that proves it`, () => {
    const { needs } = componentMap(layer, repoRoot);
    assert.deepEqual(needs['arena-table'], ['arena-icon', 'arena-pagination', 'arena-select'],
      'a table renders all three, and a subset naming table alone is a paginated table with no pagination or caret');
    for (const [sheet, pulled] of Object.entries(needs) as [string, string[]][]) {
      assert.ok(!pulled.includes(sheet), `${sheet} needs itself, so the closure did not drop the self edge`);
    }
  });
}

test('a chart resolves to the sheet of its own manifest, which carries its legend and tooltip', () => {
  const angular = componentMap('angular', repoRoot);
  const react = componentMap('react', repoRoot);
  assert.equal(angular.draws['arena-bar-chart'], 'arena-bar-chart');
  assert.equal(react.draws.ArenaBarChart, 'arena-bar-chart');
});

test('a component wears its parent\'s sheet, because 43 sheets dress 55 components', () => {
  const angular = componentMap('angular', repoRoot);
  const react = componentMap('react', repoRoot);
  assert.equal(angular.draws['arena-side-nav-item'], 'arena-side-nav');
  assert.equal(angular.draws['arena-table-row'], 'arena-table');
  assert.equal(react.draws.ArenaSideNavItem, 'arena-side-nav');
  assert.equal(react.draws.ArenaTableRow, 'arena-table');
});

test('a map is derived per layer, and the two agree where the two layers compose the same thing', () => {
  const angular = componentMap('angular', repoRoot);
  const react = componentMap('react', repoRoot);
  for (const map of [react, angular]) {
    assert.deepEqual(map.needs['arena-confirm-dialog'], ['arena-button', 'arena-icon'],
      'the cancel action IS an ArenaButton, which draws a glyph, so both layers render both and the sheet follows');
  }
});

test('a layer nothing assembles is refused rather than answered with an empty map', () => {
  assert.throws(() => componentMap('svelte', repoRoot), /no map is derived for a layer called "svelte"/);
});

test('the manifest a source reads is followed across directories, not only beside it', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-map-'));
  mkdirSync(join(root, 'arena-side-nav-item'));
  mkdirSync(join(root, 'arena-side-nav'));
  writeFileSync(join(root, 'arena-side-nav', 'ArenaSideNav.variants.ts'),
    "import manifest from './ArenaSideNav.classes.generated';\nexport const arenaSideNavStyles = arenaStyles(manifest);\n");
  const file = join(root, 'arena-side-nav-item', 'ArenaSideNavItem.ts');
  assert.equal(sheetOf(file, "import { arenaSideNavStyles } from '../arena-side-nav/ArenaSideNav.variants';"), 'arena-side-nav');
  assert.equal(sheetOf(file, 'import { Component } from "@angular/core";'), null);
  rmSync(root, { recursive: true });
});

test('a chain of needs is walked to the end, so a sheet two hops away still ships', () => {
  assert.deepEqual(close({ a: ['b'], b: ['c'], c: [] }), { a: ['b', 'c'], b: ['c'] });
  assert.deepEqual(close({ a: ['b'], b: ['a'] }), { a: ['b'], b: ['a'] }, 'a cycle terminates rather than hanging');
});

test('both maps are derived from the layer they describe and nothing else', () => {
  assert.notDeepEqual(angularComponentMap(repoRoot).draws, reactComponentMap(repoRoot).draws);
});

test('every projection marker the layer declares is one the map carries', () => {
  const declared = markerAttributes();
  const source = readFileSync(join(repoRoot, MARKERS_FILE), 'utf8');
  const classes = [...source.matchAll(/export class (Arena[A-Za-z0-9]*)/g)].map((one) => one[1]);
  assert.ok(classes.length > 0, `${MARKERS_FILE} declares no marker, so this case proves nothing`);
  assert.deepEqual([...declared.keys()].sort(), [...classes].sort(),
    'the map is derived from this file rather than kept beside it, because a hand-kept copy went '
    + 'five markers short and the report that catches a missing import was silent over all five');
});

test('a marker whose class is not its attribute capitalised is carried, not guessed', () => {
  const declared = markerAttributes();
  assert.equal(declared.get('ArenaFigureSlot'), 'figure',
    'ArenaFigure is the component that holds the slot, so guessing the directive from the '
    + 'attribute names the wrong symbol');
});

test('the React map names the index exports a consumer opens as a tag and that draw no sheet', () => {
  const map = componentMap('react', repoRoot);
  assert.deepEqual(map.sheetless, ['ArenaIconsProvider', 'ArenaLocaleProvider']);
  assert.deepEqual((map.sheetless ?? []).filter((name) => name in map.draws), [],
    'a name that draws a sheet is a component, and is placed by draws');
  assert.equal('sheetless' in componentMap('angular', repoRoot), false,
    'Angular exports no element selector outside its components');
});

test('a provider added to a helper module the index re-exports is placed without editing a list', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-sheetless-'));
  try {
    const react = join(root, 'frameworks', 'react');
    mkdirSync(join(react, 'components'), { recursive: true });
    writeFileSync(join(react, 'Index.generated.ts'),
      "export * from './components/Thing.ts';\nexport * from './Foo.ts';\n");
    writeFileSync(join(react, 'components', 'Thing.ts'), 'export function ArenaThing() { return null; }\n');
    writeFileSync(join(react, 'Foo.ts'), 'export function FooProvider() { return null; }\nexport const useFoo = 1;\n');
    assert.deepEqual(reactSheetless({}, root), ['FooProvider']);
    assert.deepEqual(reactSheetless({ FooProvider: null }, root), []);
    writeFileSync(join(react, 'Index.generated.ts'), "export * from './Gone.ts';\n");
    assert.throws(() => reactSheetless({}, root), /component-map: .*Gone\.ts/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('both layers close the same needs for every sheet both draw', () => {
  const angular = componentMap('angular', repoRoot);
  const react = componentMap('react', repoRoot);
  const both = [...new Set(Object.values(angular.draws))]
    .filter((s): s is string => Boolean(s))
    .filter((s) => Object.values(react.draws).includes(s));
  for (const sheet of both) {
    assert.deepEqual(react.needs[sheet] ?? [], angular.needs[sheet] ?? [], sheet);
  }
});

test('a relative import from the same category is a use, as one from another category is', () => {
  const source = "import { ArenaCard } from '../arena-card/ArenaCard.tsx';\nimport { ArenaIcon } from '../../display/arena-icon/ArenaIcon.tsx';";
  assert.deepEqual([...source.matchAll(LAYER_IMPORT)].map((m) => captured(m)), ['ArenaCard', 'ArenaIcon']);
  assert.deepEqual([..."from '../MainRegion.ts'".matchAll(LAYER_IMPORT)], []);
});

test('a marker query is read with or without options', () => {
  const source = 'contentChild(ArenaFooter)\ncontentChild(ArenaActions, { descendants: false })';
  assert.deepEqual([...source.matchAll(QUERIED_MARKER)].map((m) => captured(m)), ['ArenaFooter', 'ArenaActions']);
});
