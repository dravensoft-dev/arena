/* The gate reads the real tree, so each rule is driven over a temporary copy of it with the shape a
 * real mistake takes: a stray page, a fourth segment, an index over its limit, a component role
 * written into a markup page, a role row in a second leaf, a child with no "Read this", and a
 * hand-edited region row. The real tree is asserted clean last, so a pass is not a pass over nothing. */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { treeProblems, treePaths, LEAF_MAX, INDEX_MAX, LEAF_ALLOWANCE, node } from './check-token-tree.ts';
import { TREE_DIR } from '../../generate/arena/generate-token-tree.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

const made: string[] = [];
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

function copy() {
  const base = mkdtempSync(join(tmpdir(), 'arena-token-tree-'));
  made.push(base);
  cpSync(join(repoRoot, TREE_DIR), join(base, TREE_DIR), { recursive: true });
  cpSync(join(repoRoot, 'contracts', 'design'), join(base, 'contracts', 'design'), { recursive: true });
  cpSync(join(repoRoot, 'frameworks', 'tailwind', 'Theme.css'), join(base, 'frameworks', 'tailwind', 'Theme.css'));
  return base;
}
const file = (base: string, rel: string) => join(base, TREE_DIR, rel);
const edit = (base: string, rel: string, change: (text: string) => string) =>
  writeFileSync(file(base, rel), change(readFileSync(file(base, rel), 'utf8')));
const only = (base: string, pattern: RegExp) => treeProblems(base).filter((problem) => pattern.test(problem));

test('the committed tree holds every rule, and the gate looked at a real set of pages', () => {
  assert.deepEqual(treeProblems(), []);
  assert.ok(treePaths().all.size >= 20, 'the tree named too few pages for a clean pass to say anything');
  assert.deepEqual(node.writes, []);
});

test('a page outside the tree is a problem', () => {
  const base = copy();
  writeFileSync(file(base, 'markup/notes.md'), '# Notes\n');
  assert.equal(only(base, /markup\/notes\.md.*neither an index nor a child/).length, 1);
});

test('a missing child is a problem', () => {
  const base = copy();
  rmSync(file(base, 'markup/edges.md'));
  assert.equal(only(base, /markup\/edges\.md is a child of the tree and does not exist/).length, 1);
});

test('a fourth segment below references/ is a problem', () => {
  const base = copy();
  mkdirSync(file(base, 'markup/deep'), { recursive: true });
  writeFileSync(file(base, 'markup/deep/x.md'), '# X\n');
  assert.equal(only(base, /4 segments below references/).length, 1);
});

test('an index over INDEX_MAX is a problem', () => {
  const base = copy();
  edit(base, 'markup/index.md', (text) => `${text}\n${'x'.repeat(INDEX_MAX + 1 - text.length)}`);
  assert.equal(only(base, /markup\/index\.md holds \d+ characters; an index may hold at most 3000/).length, 1);
});

const LEAF_ROWS = [
  { name: 'edges.md one over LEAF_MAX', page: 'markup/edges.md', length: LEAF_MAX + 1, problems: 1 },
  { name: 'edges.md at LEAF_MAX', page: 'markup/edges.md', length: LEAF_MAX, problems: 0 },
  { name: 'states.md one over LEAF_MAX', page: 'markup/states.md', length: LEAF_MAX + 1, problems: 0 },
  { name: 'states.md at its allowance', page: 'markup/states.md', length: LEAF_ALLOWANCE['markup/states.md']!.max, problems: 0 },
  { name: 'states.md one over its allowance', page: 'markup/states.md', length: LEAF_ALLOWANCE['markup/states.md']!.max + 1, problems: 1 },
];

test('a leaf over its length is a problem, and the allowance lifts only the page it names', () => {
  for (const row of LEAF_ROWS) {
    const base = copy();
    const pattern = new RegExp(`${row.page.replace('.', '\\.')} holds \\d+ characters; a leaf may hold at most`);
    const probe = (text: string) => (text.length >= row.length ? text.slice(0, row.length) : `${text}${'x'.repeat(row.length - text.length)}`);
    edit(base, row.page, probe);
    assert.equal(only(base, pattern).length, row.problems, row.name);
  }
});

test('every leaf allowance carries a reason of at most 1,200 characters', () => {
  for (const [page, one] of Object.entries(LEAF_ALLOWANCE)) {
    assert.ok(one.reason.length > 0, `${page} has no reason`);
    assert.ok(one.reason.length <= 1200, `${page} reason holds ${one.reason.length} characters`);
  }
});

test('a component role as a custom property in a markup page is a problem, the bare name is not', () => {
  const base = copy();
  edit(base, 'markup/edges.md', (text) => `${text}\nThe control height is size-sm-control-h here.\n`);
  assert.deepEqual(only(base, /component role/), []);
  edit(base, 'markup/edges.md', (text) => `${text}\nThe control height is --size-sm-control-h here.\n`);
  assert.equal(only(base, /markup\/edges\.md writes the component role --size-sm-control-h/).length, 1);
});

test('only markup/states.md may name the control roles, and no other component role passes there', () => {
  const base = copy();
  edit(base, 'markup/edges.md', (text) => `${text}\nThe track is --fill-control-on here.\n`);
  assert.equal(only(base, /markup\/edges\.md writes the component role --fill-control-on/).length, 1);
  edit(base, 'markup/states.md', (text) => `${text}\nThe knob is --fill-knob-off here.\n`);
  assert.deepEqual(only(base, /markup\/states\.md writes the component role --fill-knob-off/), []);
  edit(base, 'markup/states.md', (text) => `${text}\nThe hue is --hue-info-ink here.\n`);
  assert.equal(only(base, /markup\/states\.md writes the component role --hue-info-ink/).length, 1);
});

test('markup/index.md may name a component role on the line that links the components index', () => {
  const base = copy();
  edit(base, 'markup/index.md', (text) => `${text}\nSee [components](../components/index.md) for --size-sm-control-h.\n`);
  assert.deepEqual(only(base, /component role/), []);
});

test('a page with no rows that keeps a tree block is a problem', () => {
  const base = copy();
  edit(base, 'markup/units.md', (text) => `${text}\n<!-- @tree GENERATED by bun run generate:token-tree. Edit that script, not this copy. -->\n<!-- @tree end -->\n`);
  assert.equal(only(base, /markup\/units\.md.*not what generate:token-tree writes/).length, 1);
});

test('a role row duplicated into a second leaf is a problem', () => {
  const base = copy();
  edit(base, 'components/type.md', (text) => `${text}\n| \`--size-sm-control-h\` | dimension | none | none |\n`);
  assert.equal(only(base, /The row of --size-sm-control-h sits in/).length, 1);
});

test('a role row missing from its leaf is a problem', () => {
  const base = copy();
  edit(base, 'components/size-controls.md', (text) => text.split('\n').filter((line) => !line.startsWith('| `--size-sm-control-h`')).join('\n'));
  assert.equal(only(base, /The row of --size-sm-control-h sits in no page/).length, 1);
});

test('a markup role row missing from its markup leaf, or moved to another, is a problem', () => {
  const base = copy();
  const row = readFileSync(file(base, 'markup/edges.md'), 'utf8').split('\n').find((line) => line.startsWith('| `--bw-control` |'))!;
  edit(base, 'markup/edges.md', (text) => text.replace(`${row}\n`, ''));
  assert.equal(only(base, /The row of --bw-control sits in .*and it belongs in exactly/).length, 1);
  edit(base, 'markup/states.md', (text) => `${text}\n${row}\n`);
  assert.equal(only(base, /The row of --bw-control sits in markup\/states\.md/).length, 1);
});

test('a child with no "Read this" is a problem', () => {
  const base = copy();
  edit(base, 'plugin/edges.md', (text) => text.replaceAll('Read this', 'Open this'));
  assert.equal(only(base, /plugin\/edges\.md has no sentence that starts "Read this"/).length, 1);
});

test('a hand-edited region row is a problem', () => {
  const base = copy();
  edit(base, 'components/size-controls.md', (text) => text.replace(/(\| `--size-sm-control-h` \| [^|]+\| )dimension/, '$1number'));
  assert.equal(only(base, /components\/size-controls\.md holds a region that is not what generate:token-tree writes/).length, 1);
});
