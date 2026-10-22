/* RESOLVES_AGAINST is what lets a DTCG reference cross a source file, and it is opt-in
 * per source rather than a merge of all eleven: two palettes declare the same token paths,
 * so merging them would let one theme's description leak onto the other's value. That
 * makes every entry a claim, and a stale one is silent -- these tests are the check. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import nodePath, { join, win32, posix } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { DESIGN_DIR, FILES, REDECLARED_GROUPS, RESOLVES_AGAINST, SCOPE_SELECTORS, SCRIPT_TARGETS, collectScriptTokens, designPath, isFrom, referenceOf, scopesRedeclaring } from './generate-tokens.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { readFamilies } from '../../lib/tailwind/vocabulary.ts';
import { relPosix } from '../../utils/posix-path.ts';

const DESIGN = join(repoRoot, DESIGN_DIR);
const BLOCKS = FILES.flatMap((f) => f.blocks) as { source: string; dir?: string }[];
const DIR_OF = new Map(BLOCKS.map((b) => [b.source, b.dir ?? DESIGN_DIR]));
const SOURCES = [...DIR_OF.keys()];
const REFERENCE = /"\$value"\s*:\s*"\{([^}]+)\}"/g;

const pathOf = (source: string) => join(repoRoot, DIR_OF.get(source) ?? DESIGN_DIR, source);

function referencedGroups(source: string) {
  const text = readFileSync(pathOf(source), 'utf8');
  return [...text.matchAll(REFERENCE)].map((m) => m[1]?.split('.')[0]);
}

function topLevelGroups(source: string) {
  return Object.keys(readJson(pathOf(source)));
}

const SCRIPT_FLAG = /"script"\s*:\s*true/g;

test('FILES declares no block outside a theme, a density or a plugin in the store', () => {
  const selectors = FILES.flatMap((f) => f.blocks.map((b) => b.selector));
  const scopes = [...new Set(selectors.filter((s) => s !== ':root'))].sort();
  assert.deepEqual(scopes, ['.arena-complete', '.arena-dark', '.arena-light'],
    'a scope this generator emits is a theme or a plugin the store holds; a density is a vocabulary '
    + 'family and every other selector would be an answer Arena curated for somebody else');
});

test('a design source path carries no host separator, on the platform whose separator is one', () => {
  for (const [name, on] of [['the host', nodePath], ['win32', win32]] as const) {
    for (const source of SOURCES) {
      const spelled = designPath(source, DIR_OF.get(source), on);
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
    n + [...readFileSync(pathOf(source), 'utf8').matchAll(SCRIPT_FLAG)].length, 0);
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
  const written = FILES.flatMap((file) => file.blocks.map((b) => b.selector));
  const families = [...readFamilies().values()];
  for (const [group, scopes] of REDECLARED_GROUPS) {
    assert.ok(scopes.length > 0, `${group} claims to be redeclared and names no scope`);
    const emitted = new Set(written);
    for (const family of families.filter((f) => f.restates === group)) {
      for (const option of Object.keys(family.variants)) {
        const name = option.replace(/^arena-/, '');
        if (SCOPE_SELECTORS.has(name)) emitted.add(`.arena-${name}`);
      }
    }
    for (const scope of scopes) {
      const selector = SCOPE_SELECTORS.get(scope);
      assert.ok(selector, `${group} names the scope "${scope}", which has no selector`);
      assert.ok(emitted.has(`.arena-${scope}`),
        `${group} names the scope "${scope}", which no block in FILES writes: a reference restated `
        + 'into a selector nothing else declares would sit alone and answer nothing');
    }
  }
});

test('a reference is restated under the scopes that redeclare it, and under no others', () => {
  assert.deepEqual(scopesRedeclaring(aliasing('{color.base-200}', 'color')), ['dark', 'light']);
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

test('the default plugin answers every declared role', () => {
  const declared = Object.keys(readJson(join(repoRoot, 'contracts/design/roles.json')));
  const css = readFileSync(join(repoRoot, 'contracts/design-generated/style-plugin.default.generated.css'), 'utf8');
  assert.deepEqual(declared.filter((role) => !css.includes(`--${role}:`)), [],
    'a role the root plugin leaves unanswered is a custom property with no value, which is invalid '
    + 'at computed-value time: the declaration reading it is dropped and the property disappears');
});

test('the default palette wears a class: .arena-dark carries the :root block, and the default plugin restates under it what it restates under .arena-light', async () => {
  const { buildAll } = await import('./generate-tokens.ts');
  const built = await buildAll();
  const body = (css: string, selector: string) =>
    new RegExp(`^${selector.replace('.', '\\.')}\\{\\n([\\s\\S]*?)\\n\\}`, 'm').exec(css)?.[1];
  const palette = built.get('palette.generated.css') as string;
  assert.ok(body(palette, '.arena-dark'), 'palette.generated.css has no .arena-dark block');
  assert.equal(body(palette, '.arena-dark'), body(palette, ':root'));
  const plugin = built.get('style-plugin.default.generated.css') as string;
  const names = (selector: string) => [...(body(plugin, selector) ?? '').matchAll(/^\s*--([\w-]+):/gm)].map((m) => m[1]);
  assert.equal(names('.arena-dark').length, 75);
  assert.deepEqual(names('.arena-dark'), names('.arena-light'));
  const rootValue = (name: string) => new RegExp(`--${name}:([^;]+);`).exec(body(plugin, ':root') ?? '')?.[1];
  for (const line of (body(plugin, '.arena-dark') ?? '').split('\n').filter(Boolean)) {
    const [, name, value] = /--([\w-]+):([^;]+);/.exec(line) ?? [];
    assert.equal(value, rootValue(name ?? ''), `--${name} under .arena-dark is not the :root value`);
  }
  const complete = built.get('style-plugin.complete.generated.css') as string;
  assert.match(complete, /^\.arena-complete\{\n {2}--arena-plugin:complete;/m);
  const own = complete.indexOf('.arena-complete{');
  const media = complete.indexOf('@media (prefers-contrast: more) {\n.arena-complete{');
  const fit = complete.indexOf('.arena-complete{\n  --title-hero-fit:');
  assert.ok(own >= 0 && media > own && fit > media, 'the contrast widths and the hero fit follow the class block');
  assert.match(complete, /--bw-surface:var\(--bw-strong\);/);
});

test('a dark group of a plugin source reaches the base selector as well as the .arena-dark scope', async () => {
  const { block } = await import('./generate-tokens.ts');
  const tmp = mkdtempSync(join(tmpdir(), 'arena-dark-group-'));
  try {
    writeFileSync(join(tmp, 'p.tokens.json'), JSON.stringify({
      'bw-surface': { $type: 'dimension', $value: { value: 1, unit: 'px' } },
      dark: { 'bw-field': { $type: 'dimension', $value: { value: 3, unit: 'px' } } },
    }));
    const dir = relPosix(repoRoot, tmp);
    const css = await block({ selector: '.arena-p', source: 'p.tokens.json', dir });
    const base = /^\.arena-p\{\n([\s\S]*?)\n\}/m.exec(css)?.[1] ?? '';
    assert.match(base, /--bw-surface:1px;/);
    assert.match(base, /--bw-field:3px;/, 'the dark answer is missing from the base selector');
    assert.match(css, /@scope \(\.arena-dark\)[\s\S]*--bw-field:3px;/);
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
