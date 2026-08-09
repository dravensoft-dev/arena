/* The negative cases are the whole point: a gate that only ever passes over the real tree
 * proves that the tree is clean and nothing about the gate. Each shape it exists to catch is
 * provoked here against a fixture -- a literal that resolves to nothing, a built import whose
 * module has moved, and an anchor it cannot resolve, which is reported rather than skipped
 * because a skipped one is exactly the silence this closes. The live counts are asserted too,
 * since a scan that quietly stops reaching the framework suites still passes. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import {
  ANCHOR_FILE, MANIFEST, SCANNED_TREES, anchorsFrom, bindingProblems, buildsIn, builtProblems,
  literalProblems, literalsIn, namesAFile, namesOf, reachProblems, scannedFiles,
  staticImportsIn, zeroReachProblems,
} from './check-script-reach.ts';

const ANCHORS = `
export const REPO = findRepoRoot(here);
export const SCRIPTS = join(REPO, 'scripts');
export const LIB = join(SCRIPTS, 'lib');
export const UTILS = join(SCRIPTS, 'utils');
`;

function tree(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'arena-reach-'));
  for (const [rel, body] of Object.entries(files)) {
    const full = join(root, ...rel.split('/'));
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, body);
  }
  return root;
}

test('an anchor is resolved from where it is declared, and through another anchor', () => {
  const anchors = anchorsFrom(ANCHORS, '/repo');
  assert.equal(anchors.get('SCRIPTS'), join('/repo', 'scripts'));
  assert.equal(anchors.get('LIB'), join('/repo', 'scripts', 'lib'));
  assert.equal(anchors.get('UTILS'), join('/repo', 'scripts', 'utils'),
    'UTILS is declared through SCRIPTS, so a one-pass reader that never revisits would miss it');
});

test('a literal is read out of a relative specifier and out of prose alike', () => {
  assert.deepEqual(literalsIn("import { x } from '../../../scripts/lib/core/x.ts';"),
    ['scripts/lib/core/x.ts']);
  assert.deepEqual(literalsIn(' * IMPERATIVE_HANDLES in scripts/lib/arena/api-surface.ts names it.'),
    ['scripts/lib/arena/api-surface.ts'],
    'a comment naming a module is a claim about the tree, and a rename falsifies it the same way');
});

test('a shortened path is not a claim, and neither is a name that is not a path into scripts', () => {
  assert.deepEqual(literalsIn('see scripts/lib for the modules'), [], 'no extension, so no file is named');
  assert.deepEqual(literalsIn("run 'bun test scripts'"), []);
  assert.deepEqual(literalsIn('myscripts/lib/x.ts'), [], 'the segment must start at a boundary');
  assert.equal(namesAFile('scripts/lib'), false);
});

test('a literal that resolves to nothing is reported, which is the shape a move leaves behind', () => {
  const root = tree({ 'scripts/lib/core/here.ts': '' });
  try {
    assert.deepEqual(literalProblems('a.ts', ['scripts/lib/core/here.ts'], root), []);
    assert.deepEqual(literalProblems('a.ts', ['scripts/lib/core/gone.ts'], root),
      ['a.ts names scripts/lib/core/gone.ts, and nothing is there']);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a built import is resolved through its anchor, and one whose module moved is reported', () => {
  const root = tree({ 'scripts/utils/case.ts': '' });
  const anchors = anchorsFrom(ANCHORS, root);
  const good = "await import(pathToFileURL(join(UTILS, 'case.ts')).href)";
  const gone = "await import(pathToFileURL(join(LIB, 'arena', 'layers.ts')).href)";
  try {
    assert.deepEqual(builtProblems('a.ts', buildsIn(good, anchors, root), root), []);
    assert.deepEqual(builtProblems('a.ts', buildsIn(gone, anchors, root), root),
      ['a.ts imports scripts/lib/arena/layers.ts, and nothing is there'],
      'this is the break that shipped: pascal left layers.ts and the suite kept naming it');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a built import spanning lines is still read, because that is how two of them are written', () => {
  const anchors = anchorsFrom(ANCHORS, '/repo');
  const spread = "const { pascal } = await import(\n  pathToFileURL(join(UTILS, 'case.ts')).href\n) as X;";
  assert.deepEqual(buildsIn(spread, anchors, '/repo').resolved,
    [{ path: join('/repo/scripts/utils/case.ts'), names: ['pascal'] }]);
});

test('an anchor this gate cannot resolve is a problem and never a skip', () => {
  const anchors = anchorsFrom(ANCHORS, '/repo');
  const built = buildsIn("await import(pathToFileURL(join(ELSEWHERE, 'x.ts')).href)", anchors, '/repo');
  assert.deepEqual(built.resolved, []);
  assert.deepEqual(built.unresolvable, ['ELSEWHERE']);
  const problems = builtProblems('a.ts', built, '/repo');
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /no anchor of that name is declared/,
    'silently skipping what it cannot resolve is the failure this whole gate is about');
});

test('a join outside an import is not this gate\'s business', () => {
  const anchors = anchorsFrom(ANCHORS, '/repo');
  const built = buildsIn("const dir = join(ANGULAR_COMPONENTS, category.name);", anchors, '/repo');
  assert.deepEqual(built.unresolvable, [],
    'every gate builds paths from its own constants, and reporting those would be noise rather than coverage');
});

test('the names an import binds are read off both shapes, aliases and all', () => {
  assert.deepEqual(namesOf(' comparePattern, isFocusable '), ['comparePattern', 'isFocusable']);
  assert.deepEqual(namesOf(' pascal: kebabToPascal '), ['pascal'],
    'the exported name is what the target has to carry, never the local one it is bound to');
  assert.deepEqual(namesOf(' isFocusable as focusable '), ['isFocusable'],
    'a static import spells its alias with `as` and a destructured one with a colon, and the '
    + 'exported name sits on the left of either');
  assert.deepEqual(namesOf(undefined), [], 'an import that binds nothing is a path claim and no more');

  const anchors = anchorsFrom(ANCHORS, '/repo');
  assert.deepEqual(buildsIn("const { pascal: p } = await import(pathToFileURL(join(UTILS, 'case.ts')).href)",
    anchors, '/repo').resolved, [{ path: join('/repo/scripts/utils/case.ts'), names: ['pascal'] }]);
  assert.deepEqual(staticImportsIn("import { a, b as c } from '../../scripts/lib/core/x.ts';", '/repo'),
    [{ path: join('/repo/scripts/lib/core/x.ts'), names: ['a', 'b'] }]);
});

test('a binding that moved is caught even though its file is still there, which is the break that shipped', async () => {
  const root = tree({
    'scripts/utils/case.ts': 'export function pascal(n) { return n; }\n',
    'scripts/lib/arena/layers.ts': "export const LAYERS = ['react'];\n",
  });
  try {
    const target = join(root, 'scripts', 'utils', 'case.ts');
    assert.deepEqual(await bindingProblems('a.ts', [{ path: target, names: ['pascal'] }], root), []);

    const moved = join(root, 'scripts', 'lib', 'arena', 'layers.ts');
    const problems = await bindingProblems('a.ts', [{ path: moved, names: ['pascal'] }], root);
    assert.equal(problems.length, 1);
    assert.match(problems[0] ?? '', /exports no such name/,
      'the path check alone passes here, because layers.ts never went anywhere; only pascal did');
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a target that is there and will not load is reported rather than read as clean', async () => {
  const root = tree({ 'scripts/utils/broken.ts': 'export const x = (\n' });
  try {
    const problems = await bindingProblems('a.ts', [{ path: join(root, 'scripts/utils/broken.ts'), names: ['x'] }], root);
    assert.equal(problems.length, 1);
    assert.match(problems[0] ?? '', /does not load/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('a scan that reaches nothing fails rather than passing, in each of its four halves', () => {
  const anchors = anchorsFrom(ANCHORS, '/repo');
  assert.equal(zeroReachProblems(9, 65, anchors, 17).length, 0);
  assert.equal(zeroReachProblems(0, 65, anchors, 17).length, 1);
  assert.equal(zeroReachProblems(9, 0, anchors, 17).length, 1);
  assert.equal(zeroReachProblems(9, 65, new Map([['REPO', '/repo']]), 17).length, 1);
  assert.equal(zeroReachProblems(9, 65, anchors, 0).length, 1,
    'reading no binding at all would let every moved export through with the paths still clean');
});

test('the live tree is clean, and the scan really is reaching what it is for', async () => {
  const { problems, reaching, named, bound, anchors } = await reachProblems();
  assert.deepEqual(problems, []);
  assert.ok(reaching >= 9, `only ${reaching} source(s) outside scripts/ were seen to reach into it`);
  assert.ok(named >= 60, `${MANIFEST} named only ${named} path(s) under scripts/, and it holds one per script`);
  assert.ok(bound >= 15, `only ${bound} imported binding(s) were read, and nine sources bind more`);
  assert.ok(anchors.size > 4, 'the anchor file stopped declaring what this reads it for');
});

test('the anchor file and the scanned trees are on disk, so neither is a name that rotted', () => {
  assert.ok(scannedFiles().length > 100, 'the walk found almost nothing, so it proves almost nothing');
  assert.deepEqual(literalProblems('x', [], repoRoot), []);
  for (const tree of [...SCANNED_TREES, 'scripts']) assert.ok(tree.length > 0);
  assert.match(ANCHOR_FILE, /^frameworks\//);
});
