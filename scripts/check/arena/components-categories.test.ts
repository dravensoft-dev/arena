import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

const categories = readJson(join(repoRoot, 'frameworks/Components.json'));

test('the seven categories are exactly the React component group directories', () => {
  assert.deepEqual(Object.keys(categories).sort(), ['brand', 'charts', 'display', 'feedback', 'forms', 'layout', 'navigation']);
});

test('every category name is a legal directory name under the new convention', () => {
  for (const name of Object.keys(categories)) assert.match(name, /^[a-z0-9]+(-[a-z0-9]+)*$/);
});

test('each category lists its components sorted, so a diff shows only what moved', () => {
  for (const [category, names] of (Object.entries(categories) as [string, string[]][]))
    assert.deepEqual(names, [...names].sort(), `${category} is not sorted`);
  for (const names of (Object.values(categories) as string[][]))
    for (const name of names) assert.match(name, /^[A-Z][A-Za-z0-9]*$/, `${name} is not PascalCase`);
});
