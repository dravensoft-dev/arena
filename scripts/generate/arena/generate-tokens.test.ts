/* RESOLVES_AGAINST is what lets a DTCG reference cross a source file, and it is opt-in
 * per source rather than a merge of all eleven: two palettes declare the same token paths,
 * so merging them would let one theme's description leak onto the other's value. That
 * makes every entry a claim, and a stale one is silent -- these tests are the check. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import nodePath, { join, win32, posix } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { FILES, REDECLARED_GROUPS, RESOLVES_AGAINST, SCOPE_SELECTORS, SCRIPT_TARGETS, collectScriptTokens, designPath, isFrom, referenceOf, scopesRedeclaring } from './generate-tokens.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

const DESIGN = join(repoRoot, 'contracts/design');
const SOURCES = [...new Set(FILES.flatMap((f) => f.blocks.map((b) => b.source)))];
const REFERENCE = /"\$value"\s*:\s*"\{([^}]+)\}"/g;

function referencedGroups(source: string) {
  const text = readFileSync(join(DESIGN, source), 'utf8');
  return [...text.matchAll(REFERENCE)].map((m) => m[1]?.split('.')[0]);
}

function topLevelGroups(source: string) {
  return Object.keys(readJson(join(DESIGN, source)));
}

const SCRIPT_FLAG = /"script"\s*:\s*true/g;

test('a design source path carries no host separator, on the platform whose separator is one', () => {
  for (const [name, on] of [['the host', nodePath], ['win32', win32]] as const) {
    for (const source of SOURCES) {
      const spelled = designPath(source, on);
      assert.ok(!spelled.includes('\\'),
        `designPath("${source}") is "${spelled}" on ${name}. Style Dictionary hands this to glob, where a `
        + 'backslash escapes the character after it rather than separating two of them, so the pattern matches '
        + 'no file, every source loads empty, and the generated output is a header with nothing under it.');
    }
  }
});

test('a token belongs to the source whose name it carries, in every spelling glob reports one back in', () => {
  const spellings: [string, string, typeof posix][] = [
    ['a posix runner', '/home/runner/work/arena/arena/contracts/design/chart.json', posix],
    ["glob's posix mode on a Windows drive", '//?/D:/a/arena/arena/contracts/design/chart.json', posix],
    ['a native Windows path', 'D:\\a\\arena\\arena\\contracts\\design\\chart.json', win32],
  ];
  for (const [name, filePath, on] of spellings) {
    assert.ok(isFrom({ filePath } as never, 'chart.json', on),
      `${name} spells the source "${filePath}", which the walk did not recognise as chart.json. `
      + 'A source it cannot recognise contributes no token, and the generator reports success over '
      + 'a file with nothing in it.');
    assert.ok(!isFrom({ filePath } as never, 'spacing.json', on),
      `${name} spells chart.json as "${filePath}" and it was read as spacing.json, which would `
      + "emit one file's tokens under another file's block.");
  }
});

test('every token flagged script-readable survives the walk, which compares the path Style Dictionary reports back', async () => {
  const declared = SOURCES.reduce((n, source) =>
    n + [...readFileSync(join(DESIGN, source), 'utf8').matchAll(SCRIPT_FLAG)].length, 0);
  const collected = await collectScriptTokens();

  assert.equal(collected.length, declared,
    `contracts/design/ flags ${declared} token(s) script-readable and the walk found ${collected.length}. `
    + `A token lost here is an export missing from ${SCRIPT_TARGETS.join(' and ')}, which fails as a `
    + 'compile error in the layer that imports it and never as a message from this generator.');
});

test('every key and value in RESOLVES_AGAINST is a source this build actually reads', () => {
  for (const [source, against] of Object.entries(RESOLVES_AGAINST)) {
    assert.ok(SOURCES.includes(source), `RESOLVES_AGAINST names "${source}", which no block reads -- stale entry`);
    for (const other of against) {
      assert.ok(existsSync(join(DESIGN, other)), `"${source}" resolves against "${other}", which does not exist`);
      assert.notEqual(source, other, `"${source}" cannot resolve against itself`);
    }
  }
});

test('a source that references another file names it, and one that references nothing is absent', () => {
  for (const source of SOURCES) {
    const groups = new Set(referencedGroups(source));
    const own = new Set(topLevelGroups(source));
    const foreign = [...groups].filter((g): g is string => g !== undefined && !own.has(g));
    const declared: string[] = (RESOLVES_AGAINST as Record<string, string[]>)[source] ?? [];

    if (foreign.length === 0) {
      assert.equal(declared.length, 0,
        `"${source}" references nothing outside itself, so its RESOLVES_AGAINST entry is stale`);
      continue;
    }
    for (const group of foreign) {
      const holder = declared.find((other: string) => topLevelGroups(other).includes(group ?? ''));
      assert.ok(holder,
        `"${source}" references {${group}.…}, which lives in no file it resolves against -- `
        + 'the reference would silently emit unresolved');
    }
  }
});

const aliasing = (value: string, $type = 'dimension') =>
  ({ $type, $value: 0, original: { $value: value } });

test('an alias stays a reference when the token it points at is redeclared somewhere else', () => {
  assert.equal(referenceOf(aliasing('{color.base-200}', 'color')), 'var(--color-base-200)');
  assert.equal(referenceOf(aliasing('{dz.text-xs}')), 'var(--dz-text-xs)',
    'a role resolved at build time freezes the scope the generator happened to read, and .arena-compact '
    + 'redeclares every dz step, so a role aliasing one would keep the base size inside a compact region');
});

test('an alias to a token nobody redeclares resolves, because 14px is 14px in every scope', () => {
  assert.equal(referenceOf(aliasing('{r.lg}')), null);
  assert.equal(referenceOf(aliasing('{sp.4}')), null);
  assert.equal(referenceOf(aliasing('{fs.h4}')), null);
  assert.equal(referenceOf({ $type: 'dimension', $value: { value: 14, unit: 'px' } }), null);
});

test('every group that is redeclared names scopes this build actually emits', () => {
  const emitted = new Set(FILES.flatMap((file) => file.blocks.map((b) => b.selector)));
  for (const [group, scopes] of REDECLARED_GROUPS) {
    assert.ok(scopes.length > 0, `${group} claims to be redeclared and names no scope`);
    for (const scope of scopes) {
      const selector = SCOPE_SELECTORS.get(scope);
      assert.ok(selector, `${group} names the scope "${scope}", which has no selector`);
      assert.ok(emitted.has(selector(':root')),
        `${group} names the scope "${scope}", which no block in FILES writes: a reference restated `
        + 'into a selector nothing else declares would sit alone and answer nothing');
    }
  }
});

test('a reference is restated under the scopes that redeclare it, and under no others', () => {
  assert.deepEqual(scopesRedeclaring(aliasing('{color.base-200}', 'color')), ['light']);
  assert.deepEqual(scopesRedeclaring(aliasing('{dz.text-xs}')), ['compact', 'comfortable'],
    'the density axis has two scopes and a reference has to land in both, because a token restated '
    + 'into one of them still inherits the base value into the other');
  assert.deepEqual(scopesRedeclaring(aliasing('{r.lg}')), []);
});

test('a declared resolution source shares no top-level group with the file that reads it', () => {
  for (const [source, against] of Object.entries(RESOLVES_AGAINST)) {
    const own = new Set(topLevelGroups(source));
    for (const other of against) {
      const collision = topLevelGroups(other).filter((g) => own.has(g));
      assert.deepEqual(collision, [],
        `"${source}" and "${other}" both declare ${collision.join(', ')}. A shared group merges, and a merge `
        + "fills one file's missing descriptions from the other -- which is the defect the opt-in map avoids.");
    }
  }
});
