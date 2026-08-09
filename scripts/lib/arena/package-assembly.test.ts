import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import {
  EXCLUDED_NAMES, EXCLUDED_PATTERNS, CSS_CHAIN, arenaCssHeader, excluded,
  collectFiles, reset, write, copyTree, copyCli, CLI_BINS, baseManifest, version, componentSheets, writeCssChain,
  writeComponentMap,
} from './package-assembly.ts';
import { readJson } from '../../utils/read-file.ts';
import { MAP_FILE } from './component-map.ts';
import { repoRoot } from './repo-root.ts';

function tree(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'arena-assembly-'));
  for (const [path, body] of Object.entries(files) as [string, string][]) {
    const full = join(root, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, body);
  }
  return root;
}

test('a test never ships, whichever extension it takes', () => {
  for (const name of ['ArenaTag.test.ts', 'ArenaTag.test.tsx', 'ArenaButton.test.jsx', 'ArenaButton.dom.test.jsx', 'theme-css.test.ts']) {
    assert.equal(excluded(name), true, name);
  }
});

test('a demo, a specimen, a binding and a prompt never ship either', () => {
  for (const name of ['ArenaTag.card.html', 'ArenaTag.card.entry.ts', 'ArenaButton.card.entry.jsx',
    'ArenaTag.demo.generated.html', 'ArenaTag.demo.entry.generated.tsx', 'ArenaTag.demo.entry.generated.ts',
    'ArenaTag.behaviour.json', 'ArenaTag.prompt.md', 'ArenaButton.generated.js', 'BehaviourDelegated.json',
    'tsconfig.test.json', 'tsconfig.check.json']) {
    assert.equal(excluded(name), true, name);
  }
});

test('a whole directory of somebody else\'s output never ships', () => {
  assert.deepEqual([...EXCLUDED_NAMES].sort(), ['build', 'dist', 'node_modules', 'test', 'vendor']);
  for (const name of EXCLUDED_NAMES) assert.equal(excluded(name), true, name);
});

test('a real source is not swept up by any of those patterns', () => {
  for (const name of ['ArenaTag.ts', 'ArenaTag.variants.ts', 'ArenaButton.jsx', 'ArenaButton.d.ts', 'index.ts',
    'Tokens.generated.ts', 'ArenaTag.manifest.generated.ts', 'CalendarInternals.js']) {
    assert.equal(excluded(name), false, name);
  }
  assert.ok(EXCLUDED_PATTERNS.length > 0);
});

test('the walk honours the exclusion list at every depth', () => {
  const root = tree({
    'components/display/arena-tag/ArenaTag.ts': '',
    'components/display/arena-tag/ArenaTag.test.ts': '',
    'components/display/arena-tag/ArenaTag.card.html': '',
    'test/Harness.ts': '',
    'dist/Old.ts': '',
    'node_modules/x/index.ts': '',
  });
  assert.deepEqual(
    collectFiles(root).map((p) => relPosix(root, p)),
    ['components/display/arena-tag/ArenaTag.ts'],
  );
  rmSync(root, { recursive: true });
});

test('the walk of a directory that is not there is empty rather than a throw', () => {
  assert.deepEqual(collectFiles(join(tmpdir(), 'arena-nothing-here-at-all')), []);
});

test('reset empties a directory that already has a previous build in it', () => {
  const root = tree({ 'dist-probe/stale.js': 'old' });
  const dir = join(root, 'dist-probe');
  reset(dir);
  assert.equal(existsSync(join(dir, 'stale.js')), false);
  assert.equal(existsSync(dir), true);
  rmSync(root, { recursive: true });
});

test('copyTree carries a nested tree and drops what is excluded', () => {
  const from = tree({ 'a/b/Keep.ts': 'k', 'a/b/Drop.test.ts': 'd', 'a/test/Also.ts': 'x' });
  const to = mkdtempSync(join(tmpdir(), 'arena-assembly-out-'));
  const written = copyTree(from, to, 'bin');
  assert.equal(written.length, 1);
  assert.equal(readFileSync(join(to, 'bin', 'a', 'b', 'Keep.ts'), 'utf8'), 'k');
  rmSync(from, { recursive: true });
  rmSync(to, { recursive: true });
});

test('the CSS chain leads with the reset and ends with the derivations', () => {
  assert.equal(CSS_CHAIN[0]?.to, 'css/reset.css');
  assert.deepEqual(CSS_CHAIN.slice(-2).map((c) => c.to), ['css/colors.css', 'css/environment.css'],
    'both hand-authored derivation sheets read tokens the generated ones declare, so both come '
    + 'after them: colors.css derives from --color-base-content and environment.css from --sp-*');
  for (const { from } of CSS_CHAIN) {
    assert.ok(from, 'every entry of the shipped chain is copied from somewhere');
    assert.equal(existsSync(join(repoRoot, from)), true, `${from} is in the chain and not in the tree`);
  }
});

test('the stylesheet header names the package it is in', () => {
  assert.match(arenaCssHeader('@dravensoft/arena-angular'), /^\/\* @dravensoft\/arena-angular/);
});

test('the manifest takes its version and its identity from plugin.json, never from itself', () => {
  const base = baseManifest(repoRoot);
  assert.equal(base.version, version(repoRoot));
  assert.equal(base.publishConfig.access, 'public');
  assert.match(base.repository.url, /^git\+https:\/\/github\.com\//);
  assert.deepEqual(base.bin, CLI_BINS);
});

test('no command ships as TypeScript, because node_modules is where node refuses to strip it', () => {
  const ships = Object.values(CLI_BINS);
  assert.ok(ships.length > 0, 'the manifest advertises no command, so this proves nothing');

  for (const target of ships) {
    assert.doesNotMatch(target, /\.tsx?$/,
      `${target} ships as TypeScript. Node refuses to strip types for anything under a node_modules `
      + 'path, at every version and on purpose, so this is not a floor a consumer can raise past: it '
      + 'is ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING at their first run. copyCli emits .mjs.');
  }
});

test('what copyCli emits is JavaScript, and its specifiers point at what it wrote', () => {
  const to = mkdtempSync(join(tmpdir(), 'arena-assembly-cli-'));
  const written = copyCli(to, repoRoot);
  for (const one of written) {
    assert.doesNotMatch(one, /\.tsx?$/, `${one} left the assembly as TypeScript`);
    for (const m of readFileSync(join(to, one), 'utf8').matchAll(/from\s+'(\.[^']+)'/g)) {
      const spec = m[1] ?? '';
      assert.doesNotMatch(spec, /\.tsx?$/, `${one} imports ${spec}, which it did not write`);
      assert.equal(existsSync(join(to, 'bin', spec)), true, `${one} imports ${spec} and nothing is there`);
    }
  }
  rmSync(to, { recursive: true });
});

test('every command the manifest declares is copied, flat, and no two of them share a filename', () => {
  const to = mkdtempSync(join(tmpdir(), 'arena-assembly-cli-'));
  const written = copyCli(to, repoRoot);
  for (const target of Object.values(CLI_BINS)) {
    assert.ok(written.includes(target), `${target} is declared and was not copied`);
    assert.equal(existsSync(join(to, target)), true);
  }
  assert.equal(new Set(written).size, written.length, 'bin/ is flat, so a shared filename loses a file');
  rmSync(to, { recursive: true });
});

test('what a command ships reaches nothing outside bin/, because scripts/ is not there', () => {
  const to = mkdtempSync(join(tmpdir(), 'arena-assembly-cli-'));
  copyCli(to, repoRoot);
  const escaping: string[] = [];
  for (const file of collectFiles(to)) {
    if (!/\.(ts|mjs|js)$/.test(file)) continue;
    for (const m of readFileSync(file, 'utf8').matchAll(/from\s+'([^']+)'/g)) {
      const spec = m[1] ?? '';
      if (spec.startsWith('node:') || !spec.startsWith('.')) continue;
      if (!spec.startsWith('../')) continue;
      escaping.push(`${relPosix(to, file)} imports ${spec}`);
    }
  }
  assert.deepEqual(escaping, [],
    'the CLI tree is copied whole into bin/ and compiled by nobody, so a specifier that climbs out '
    + 'of it resolves in this repository and to nothing in the package. It fails at the consumer\'s '
    + 'first run, which is the one place this repository cannot see.');
  rmSync(to, { recursive: true });
});

test('each package carries the map its own layer derives, under the one name the command reads', () => {
  const to = mkdtempSync(join(tmpdir(), 'arena-assembly-map-'));
  const angular = readJson(writeComponentMap(to, 'angular', repoRoot));
  const react = readJson(writeComponentMap(join(to, 'react'), 'react', repoRoot));
  assert.equal(existsSync(join(to, MAP_FILE)), true);
  assert.equal(angular.match, 'selector');
  assert.equal(react.match, 'symbol');
  assert.notDeepEqual(angular.draws, react.draws, 'one map for two layers is a map wrong for one of them');
  rmSync(to, { recursive: true });
});

test('a map that claims no sheet at all is refused, because auto would then unstyle every screen', () => {
  const to = mkdtempSync(join(tmpdir(), 'arena-assembly-map-'));
  assert.throws(() => writeComponentMap(to, 'angular', mkdtempSync(join(tmpdir(), 'arena-empty-'))),
    /derived no component sheet for angular/);
  rmSync(to, { recursive: true });
});

test('a command whose directory moved is reported rather than shipped missing', () => {
  const to = mkdtempSync(join(tmpdir(), 'arena-assembly-cli-'));
  assert.throws(() => copyCli(to, mkdtempSync(join(tmpdir(), 'arena-empty-'))), /copied 0 files for arena-to-prod/);
  rmSync(to, { recursive: true });
});

test('write creates the directories leading to a file nobody made yet', () => {
  const root = mkdtempSync(join(tmpdir(), 'arena-assembly-'));
  write(root, 'a/b/c/File.css', 'body{}');
  assert.equal(readFileSync(join(root, 'a', 'b', 'c', 'File.css'), 'utf8'), 'body{}');
  rmSync(root, { recursive: true });
});

function tailwindTree(names: string[]) {
  const files: Record<string, string> = {
    'frameworks/tailwind/Numerals.css': '.arena-num{}',
    'frameworks/tailwind/Rhythm.css': '.arena-stack{}',
    'frameworks/tailwind/consume/Prelude.generated.css': ':root{}',
  };
  for (const name of names) {
    files[`frameworks/tailwind/components/display/${name}/${name}.manifest.json`] = '{}';
    files[`frameworks/tailwind/consume/components/display/${name}/${name}.styles.generated.css`] =
      `@import '../../../Prelude.generated.css';\n.arena-${name}{}`;
  }
  return tree(files);
}

const importsIn = (css: string) => [...css.matchAll(/@import\s+'([^']+)'/g)].map((m) => m[1]);

test('every import the component barrel writes resolves to a sheet the same call emits', () => {
  const root = tailwindTree(['tag', 'button']);
  const sheets = componentSheets('', () => ({ base: '' }), root);
  const emitted = new Set(sheets.map((s) => s.to));

  const barrel = sheets.find((s) => s.to === 'css/components.css');
  assert.ok(barrel, 'the barrel is emitted');
  const links = importsIn(barrel.content);
  assert.deepEqual(links, ['./components/button.css', './components/tag.css']);
  for (const link of links) {
    assert.ok(emitted.has(`css/${link.slice('./'.length)}`),
      `the barrel imports ${link} and no such sheet is emitted beside it`);
  }
  rmSync(root, { recursive: true });
});

test('a component sheet is reached through the barrel alone, never named twice in arena.css', () => {
  const root = tailwindTree(['tag']);
  const sheets = componentSheets('', () => ({ base: '' }), root);
  const dir = mkdtempSync(join(tmpdir(), 'arena-assembly-out-'));

  writeCssChain(dir, '@dravensoft/arena-angular', sheets, repoRoot);
  const links = importsIn(readFileSync(join(dir, 'arena.css'), 'utf8'));

  assert.equal(links.filter((l) => l?.startsWith('./css/components/')).length, 0,
    'arena.css imports css/components.css, which imports every component sheet itself');
  assert.ok(links.includes('./css/components.css'));
  assert.equal(existsSync(join(dir, 'css', 'components', 'tag.css')), true,
    'an unlinked sheet is still written, because ./css/components/* is an exported subpath');
  rmSync(root, { recursive: true });
  rmSync(dir, { recursive: true });
});
