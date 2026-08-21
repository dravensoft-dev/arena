/* The gate reads the real tree, which is correct by construction once it passes, so these drive
 * its pure functions with the shapes a broken citation takes: a path deleted by charter, one
 * naming a build step nothing answers to, and one sitting in a surface no walk used to reach, a
 * type description and a suite header. EXEMPT and BARE_EXEMPT are asserted by name. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  EXEMPT, BARE_EXEMPT, SKIPPED_ANYWHERE, SKIPPED_UNDER_FRAMEWORKS, skips, repoRoots, pathPattern,
  documents, records, headed, namesAFile, citationProblems, zeroRootProblems,
  ignoredCitationProblems, documentPassages, recordPassages, headerPassages, passages,
  SURFACE_EMPTINESS, zeroSurfaceProblems, unreadableRecordProblems,
  BARE_DOCUMENT, basenames, bareDocumentProblems, MEMBER_CITATION, memberProblems,
} from './check-citations.ts';

function tree(files: Record<string, string>) {
  const base = mkdtempSync(join(tmpdir(), 'arena-citations-'));
  for (const [rel, text] of Object.entries(files) as [string, string][]) {
    const path = join(base, rel);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, text);
  }
  return base;
}

const NONE = new Map();

test('EXEMPT names what is absent on purpose, and nothing else', () => {
  assert.deepEqual([...EXEMPT.keys()],
    ['skills/arena/SKILL.md', 'frameworks/angular/BehaviourDelegated.json']);
  for (const reason of EXEMPT.values()) assert.ok(reason.length > 40, 'an entry states its reason');
});

test('BARE_EXEMPT names what is not a document at all, and nothing else', () => {
  assert.deepEqual([...BARE_EXEMPT.keys()], ['r.md']);
  for (const reason of BARE_EXEMPT.values()) assert.ok(reason.length > 40, 'an entry states its reason');
});

test('a cited file that is not there is a problem, which is the spec a charter had already deleted', () => {
  const base = tree({
    'docs/note.md': 'x',
    'frameworks/angular/README.md': 'The argument is `docs/superpowers/specs/2026-07-23-8-api.md`.',
  });
  const problems = citationProblems(base, undefined, NONE);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /cites docs\/superpowers\/specs\/2026-07-23-8-api\.md, and nothing is there/);
});

test('scripts/build is scanned, and naming a build directory anywhere would have hidden it', () => {
  const base = tree({
    'scripts/build/README.md': 'Run `scripts/generate/arena/generate-catalog.mjs` for the index.',
  });
  assert.match(citationProblems(base, undefined, NONE)[0] ?? '', /cites scripts\/generate\/arena\/generate-catalog\.mjs/);
  assert.equal(documents(base).length, 1);
});

test('a directory named build under frameworks is skipped, and one anywhere else is not', () => {
  assert.deepEqual([...SKIPPED_ANYWHERE], ['node_modules', '.git', '.claude']);
  assert.deepEqual([...SKIPPED_UNDER_FRAMEWORKS], ['dist', 'build', 'vendor']);
  assert.equal(skips('build', 'frameworks/angular'), true);
  assert.equal(skips('build', 'scripts'), false);
  assert.equal(skips('node_modules', 'scripts'), true);
});

test('a path is judged only when it names a file, because prose shortens a path freely', () => {
  assert.equal(namesAFile('contracts/design/palette'), false);
  assert.equal(namesAFile('intro/Arena'), false);
  assert.equal(namesAFile('contracts/design/palette.dark.json'), true);
});

test('a leading slash is a URL from a site root and never a repo path', () => {
  const base = tree({ 'assets/real.svg': '<svg/>', 'a.md': '<img src="/assets/your-mark.svg" alt="" />' });
  assert.ok(repoRoots(base).includes('assets'), 'assets is a real root, so the path is recognisable');
  assert.deepEqual(citationProblems(base, undefined, NONE), []);
});

test('no roots matches nothing rather than everything, which is the failure the other way', () => {
  assert.equal('see /assets/a.svg'.match(pathPattern([])), null);
  assert.equal(zeroRootProblems([]).length, 1);
  assert.match(zeroRootProblems([])[0] ?? '', /matches every absolute path/);
  assert.deepEqual(zeroRootProblems(['scripts']), []);
});

test('a .generated. name is skipped, because a fresh clone has none of them', () => {
  const base = tree({ 'a.md': 'It imports `frameworks/react/Api.generated.ts`.' });
  assert.deepEqual(citationProblems(base, undefined, NONE), []);
});

test('an EXEMPT entry nothing cites any more fails as a stale allowance', () => {
  const base = tree({ 'a.md': 'nothing cited here' });
  const problems = citationProblems(base);
  assert.equal(problems.length, EXEMPT.size);
  assert.ok(problems.every((one) => /^EXEMPT names /.test(one)), 'every entry reports itself stale');
  assert.ok(problems.some((one) => one.includes('frameworks/angular/BehaviourDelegated.json')));
});

test('a BARE_EXEMPT entry nothing names any more fails the same way', () => {
  const base = tree({ 'a.md': 'nothing named here' });
  const problems = bareDocumentProblems(base);
  assert.equal(problems.length, BARE_EXEMPT.size);
  assert.match(problems[0] ?? '', /^BARE_EXEMPT names r\.md/);
});

test('a name BARE_EXEMPT covers is not read as a document, which is how a scale step passes', () => {
  const base = tree({ 'contracts/design/roles.json': '{ "$description": "r.md is nested cards" }' });
  assert.deepEqual(bareDocumentProblems(base), [],
    'the entry is met, so it is neither a problem nor a stale allowance');
});

test('the roots come from the tree, so a new top-level directory is covered the day it lands', () => {
  const base = tree({ 'newthing/a.md': 'x', 'a.md': 'see `newthing/gone.md`' });
  assert.ok(repoRoots(base).includes('newthing'));
  assert.match(citationProblems(base, undefined, NONE).find((p) => p.includes('gone')) ?? '',
    /cites newthing\/gone\.md/);
});

test('the pattern refuses a path glued to a longer word', () => {
  const pattern = pathPattern(['scripts']);
  assert.equal('myscripts/a.mjs'.match(pattern), null);
  assert.deepEqual('see scripts/a.mjs'.match(pattern), ['scripts/a.mjs']);
});

test('a surface that reaches nothing is a failure, not a clean pass, and each says what it hides', () => {
  assert.deepEqual([...SURFACE_EMPTINESS.keys()], ['document', 'record', 'header']);
  for (const cost of SURFACE_EMPTINESS.values()) assert.ok(cost.length > 40, 'an entry states its cost');
  assert.deepEqual(zeroSurfaceProblems({ document: 1, record: 1, header: 1 }), []);
  const problems = zeroSurfaceProblems({ document: 1, record: 0, header: 0 });
  assert.equal(problems.length, 2);
  assert.match(problems[0] ?? '', /found 0 record\(s\); an empty surface is a failure/);
  assert.equal(zeroSurfaceProblems({}).length, SURFACE_EMPTINESS.size);
});

test('a path named in a type description is held, which no walk over .md could reach', () => {
  const base = tree({
    'contracts/api/types/arena-number-format.json':
      '{ "description": "the distinction contracts/api/README.md draws", "fields": {} }',
    'contracts/api/AGENTS.md': '# real',
  });
  const problems = citationProblems(base, undefined, NONE);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '',
    /arena-number-format\.json:description: cites contracts\/api\/README\.md, and nothing is there/);
});

test('a prose value is addressed by its json path rather than by a line, which an edit moves', () => {
  const base = tree({
    'frameworks/angular/A.behaviour.json':
      '{ "bindings": [ { "reason": "R6 in contracts/api/README.md is why" } ] }',
    'contracts/api/AGENTS.md': '# real',
  });
  assert.match(citationProblems(base, undefined, NONE)[0] ?? '', /:bindings\.0\.reason: cites /);
});

test('a value outside prose is not a claim at all, because a key decides which strand is read', () => {
  const base = tree({ 'contracts/api/components/A.json': '{ "seed": "contracts/api/README.md" }' });
  assert.deepEqual(citationProblems(base, undefined, NONE), []);
});

test('a json this gate cannot parse is a hole in the walk rather than a file with nothing to say', () => {
  const base = tree({ 'contracts/api/components/A.json': '{ "description": ' });
  assert.deepEqual(recordPassages(base), [], 'nothing is invented from a file that does not parse');
  const problems = unreadableRecordProblems(base);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /is not readable as JSON, so its prose contributes no passage/);
});

test('the one header a script or a suite is allowed is read, and its line is the absolute one', () => {
  const base = tree({
    'frameworks/react/test/GuardedNames.test.tsx':
      'import x from "y";\n\n/* first line\n * contracts/api/README.md requires a name */\nconst a = 1;\n',
    'contracts/api/AGENTS.md': '# real',
  });
  const problems = citationProblems(base, undefined, NONE);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /GuardedNames\.test\.tsx:4: cites contracts\/api\/README\.md/);
});

test('a component source carries no comment at all, so it is not a surface this gate walks', () => {
  const base = tree({
    'frameworks/react/components/display/arena-x/ArenaX.tsx': '/* contracts/api/README.md */\n',
    'scripts/check/arena/check-x.ts': '/* contracts/api/README.md */\n',
    'contracts/api/AGENTS.md': '# real',
  });
  assert.equal(headed(base).length, 1, 'only the script may carry a header, so only it is read');
  assert.equal(headerPassages(base).length, 1);
  assert.equal(citationProblems(base, undefined, NONE).length, 1);
});

test('every surface reaches the same passage shape, so one rule set judges all three', () => {
  const base = tree({
    'a.md': 'x',
    'contracts/api/components/A.json': '{ "description": "y" }',
    'scripts/a.ts': '/* z */\n',
  });
  const all = passages(base);
  assert.equal(all.length, documentPassages(base).length + recordPassages(base).length
    + headerPassages(base).length);
  for (const one of all) assert.deepEqual(Object.keys(one).sort(), ['at', 'rel', 'text']);
  assert.deepEqual(records(base).map((p) => p.endsWith('A.json')), [true]);
});

test('a bare document name no file in the tree carries is a problem', () => {
  const base = tree({ 'a.md': 'the failure `components-divergences.md` records', 'b.md': 'x' });
  const problems = bareDocumentProblems(base, undefined, undefined, NONE);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /names components-divergences\.md, and no document in the tree/);
});

test('a bare name that does exist passes, wherever in the tree it sits', () => {
  const base = tree({ 'a.md': 'see AGENTS.md', 'deep/nested/AGENTS.md': 'x' });
  assert.deepEqual(bareDocumentProblems(base, undefined, undefined, NONE), []);
});

test('a metavariable is written <Name>, which the pattern cannot match, so it needs no exception', () => {
  assert.equal('a fixture at <Name>.demo.json'.match(BARE_DOCUMENT), null);
  assert.deepEqual('see X.prompt.md'.match(BARE_DOCUMENT), ['X.prompt.md']);
});

test('a citation git ignores is a problem, because no clone can follow it', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-citations-ignored-'));
  try {
    mkdirSync(join(dir, 'docs'), { recursive: true });
    writeFileSync(join(dir, 'docs', 'plan.md'), '# a plan');
    writeFileSync(join(dir, 'AGENTS.md'), 'The plan is docs/plan.md and it says so.\n');

    const problems = ignoredCitationProblems(dir, documentPassages(dir, [join(dir, 'AGENTS.md')]),
      new Set(['docs']));
    assert.equal(problems.length, 1, 'the file IS there, which is exactly why nothing else fails');
    assert.match(problems[0] ?? '', /docs\/plan\.md/);
    assert.match(problems[0] ?? '', /no clone can follow it/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('an ignored root leaves the alternation, so the gate reads one tree on every machine', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-citations-roots-'));
  try {
    mkdirSync(join(dir, 'docs'));
    mkdirSync(join(dir, 'contracts'));
    assert.deepEqual(repoRoots(dir, new Set(['docs'])), ['contracts'],
      'docs/ exists on the machine a spec was written on and on no clone, so leaving it in would '
      + 'make this gate scan a different alternation depending on where it ran');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('a shortened path is not a claim, even under an ignored root', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-citations-prose-'));
  try {
    writeFileSync(join(dir, 'AGENTS.md'), 'Specs live under docs/superpowers/specs/ by charter.\n');
    assert.deepEqual(ignoredCitationProblems(dir, documentPassages(dir, [join(dir, 'AGENTS.md')]),
      new Set(['docs'])), [],
    'naming the directory a document goes in is the charter stating itself, and only a path '
      + 'carrying an extension is a claim about a file');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the walk does not descend into an ignored root, so every surface is the same everywhere', () => {
  const dir = mkdtempSync(join(tmpdir(), 'arena-citations-walk-'));
  try {
    mkdirSync(join(dir, 'docs', 'superpowers', 'plans'), { recursive: true });
    writeFileSync(join(dir, 'docs', 'superpowers', 'plans', 'a-plan.md'), 'cites nothing/real.md\n');
    writeFileSync(join(dir, 'docs', 'superpowers', 'plans', 'a-plan.json'), '{ "reason": "x" }');
    writeFileSync(join(dir, 'AGENTS.md'), '# real\n');

    assert.deepEqual(documents(dir, new Set(['docs'])), [join(dir, 'AGENTS.md')],
      'a scratch plan is not a document this repository holds to its citations, and judging one '
      + 'is the same defect as scanning a different alternation: the answer depends on whether a '
      + 'directory happens to sit on the machine the gate ran on');

    assert.deepEqual(records(dir, new Set(['docs'])), [],
      'the surface a walk gained is held to the same tree as the one it had');

    assert.ok(!basenames(dir, new Set(['docs'])).has('a-plan.md'),
      'a bare citation resolving to a scratch file would pass here and fail on every clone');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the member half of a citation is held to the file declaring it', () => {
  const base = tree({
    'AGENTS.md': 'It is `scripts/utils/case.ts:kebab(name)` and `scripts/lib/layers.ts:kebab(name)`.',
    'scripts/utils/case.ts': 'export function kebab(name: string) { return name; }',
    'scripts/lib/layers.ts': 'export const LAYERS = [];',
  });
  const problems = memberProblems(base, documentPassages(base));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /cites scripts\/lib\/layers\.ts:kebab\(\), and that file declares no kebab/);
  assert.match(problems[0] ?? '', /the wrong file with the right confidence/);
});

test('a member citation resolves relative to the document as well as to the root', () => {
  const base = tree({
    'scripts/AGENTS.md': 'See `graph/nodes.ts:allNodes()`.',
    'scripts/graph/nodes.ts': 'export async function allNodes() { return []; }',
  });
  assert.deepEqual(memberProblems(base, documentPassages(base)), []);
});

test('a citation naming no file, and one naming a document, are not member citations', () => {
  assert.deepEqual([...'a `README.md:section()` and `x.ts:member(` here'.matchAll(MEMBER_CITATION)]
    .map((m) => m[1]), ['README.md', 'x.ts']);
  const base = tree({ 'AGENTS.md': 'See `docs/notes.md:heading()`.', 'docs/notes.md': '# heading' });
  assert.deepEqual(memberProblems(base, documentPassages(base)), [],
    'only a source file carries a member, so a .md citation is left to the path half');
});
