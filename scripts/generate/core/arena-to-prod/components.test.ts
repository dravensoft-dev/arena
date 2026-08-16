import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve, selectorKeys, symbolKeys, namedImports, AUTO } from './components.ts';
import type { ComponentMap } from './components.ts';

const ANGULAR: ComponentMap = {
  match: 'selector',
  draws: {
    'arena-button': 'button',
    'arena-table': 'table',
    'arena-table-row': 'table',
    'arena-pagination': 'pagination',
    'arena-select': 'select',
    'arena-bar-chart': null,
  },
  needs: { table: ['pagination', 'select'] },
};

const resolved = (map: ComponentMap, sources: string[], packageName: string) => {
  const found = resolve(map, sources, packageName);
  if (!found) throw new Error(`resolve read nothing against a map keyed by ${map.match}`);
  return found;
};

const REACT: ComponentMap = {
  match: 'symbol',
  draws: { ArenaButton: 'button', ArenaTable: 'table', ArenaTableRow: 'table', ArenaPagination: 'pagination', ArenaSelect: 'select', ArenaBarChart: null },
  needs: { table: ['pagination', 'select'] },
};

test('the key a consumer writes is not the sheet that dresses it', () => {
  const { components } = resolved(ANGULAR, ['<arena-table-row />'], '@dravensoft/arena-angular');
  assert.deepEqual(components, ['pagination', 'select', 'table'], 'a row wears the table, and the table brings two');
});

test('what Arena draws for you is added and named apart from what you drew', () => {
  const found = resolved(ANGULAR, ['<arena-table></arena-table>'], '@dravensoft/arena-angular');
  assert.deepEqual(found.drawn, ['table']);
  assert.deepEqual(found.pulled, ['pagination', 'select']);
});

test('a sheet you already draw is never counted as one Arena pulled in', () => {
  const found = resolved(ANGULAR, ['<arena-table /><arena-select />'], '@dravensoft/arena-angular');
  assert.deepEqual(found.pulled, ['pagination'], 'select is yours, so it is not also Arena\'s doing');
  assert.deepEqual(found.components, ['pagination', 'select', 'table']);
});

test('a component that draws no classes costs no sheet, and is not a miss either', () => {
  const found = resolved(ANGULAR, ['<arena-bar-chart /><arena-button />'], '@dravensoft/arena-angular');
  assert.deepEqual(found.components, ['button']);
  assert.deepEqual(found.unplaced, [], 'it is in the map, so nothing is reported about it');
});

test('a React symbol imported here AND opened as a tag, that the map does not know, is reported', () => {
  const found = resolved(REACT, ["import { ArenaWidget } from '@dravensoft/arena-react';\nconst a = <ArenaWidget />;"],
    '@dravensoft/arena-react');
  assert.deepEqual(found.unplaced, ['ArenaWidget']);
});

test('a React import that is a type or a helper is not reported, because it opens no tag', () => {
  const found = resolved(REACT, ["import { ArenaTone, arenaViewportBelow } from '@dravensoft/arena-react';"],
    '@dravensoft/arena-react');
  assert.deepEqual(found.unplaced, [], 'half of what a consumer imports from here is not a component');
});

test('a tag of the consumer\'s own is not reported, however it is spelt', () => {
  const found = resolved(REACT, ['const a = <Card />; const b = <ArenaLikeThing />;'], '@dravensoft/arena-react');
  assert.deepEqual(found.unplaced, [], 'a capitalised tag this package never exported belongs to whoever wrote it');
});

test('an element wearing the prefix that Arena does not ship is reported and stops nothing', () => {
  const found = resolved(ANGULAR, ['<arena-widget /><arena-button />'], '@dravensoft/arena-angular');
  assert.deepEqual(found.unplaced, ['arena-widget']);
  assert.deepEqual(found.components, ['button'], 'the run still has a subset to write');
});

test('a selector is matched at its end, so one name is not read inside a longer one', () => {
  const { drawn } = selectorKeys(ANGULAR, ['<arena-table-row />']);
  assert.deepEqual(drawn, ['arena-table-row'], 'arena-table is a prefix of it and was not drawn');

  const hooked = selectorKeys(ANGULAR, ['<tr arena-table-row [interactive]="true">']);
  assert.deepEqual(hooked.drawn, ['arena-table-row'],
    'a primitive written as an attribute on a native element is used as much as one written as an element, '
    + 'and a sheet it needs is missing from the emit if it is not read');

  const bystander = selectorKeys(ANGULAR, ['<div data-arena-part="table.body"></div>', '<div class="arena-num"></div>']);
  assert.deepEqual([...bystander.drawn, ...bystander.unplaced], [],
    'the hook is read from an attribute POSITION and not from anything that merely starts with arena-, '
    + 'or every part hook in a consumer\'s own markup is reported as a component nobody can place');
});

test('React is read through the import that names the package', () => {
  const source = "import { ArenaButton, ArenaTable as ArenaGrid } from '@dravensoft/arena-react';";
  const { drawn } = symbolKeys(REACT, [source], '@dravensoft/arena-react');
  assert.deepEqual(drawn, ['ArenaButton', 'ArenaTable'], 'the alias is the consumer\'s; the name in the import is Arena\'s');
});

test('React is also read through the tag it opens, for a symbol reached another way', () => {
  const { drawn } = symbolKeys(REACT, ['<ArenaPagination page={1} />'], '@dravensoft/arena-react');
  assert.deepEqual(drawn, ['ArenaPagination']);
});

test('a bare word is not a component, because half this library is called ArenaTable in somebody else\'s code', () => {
  const { drawn } = symbolKeys(REACT, ['const ArenaTable = ourOwnThing; render(ArenaTable);'], '@dravensoft/arena-react');
  assert.deepEqual(drawn, [], 'no import from the package and no tag opened, so nothing of Arena\'s was written');
});

test('the import is matched against this package alone', () => {
  const shape = namedImports('@dravensoft/arena-react');
  assert.ok(shape.test("import { ArenaButton } from '@dravensoft/arena-react';"));
  assert.equal(namedImports('@dravensoft/arena-react').test("import { ArenaButton } from '@acme/arena-react';"), false);
});

test('a map keyed by something this command cannot scan for is an answer of none', () => {
  assert.equal(resolve({ match: 'behaviour', draws: {}, needs: {} }, ['x'], '@dravensoft/arena-react'), null);
});

test('the word the config takes is stated once', () => {
  assert.equal(AUTO, 'auto');
});
