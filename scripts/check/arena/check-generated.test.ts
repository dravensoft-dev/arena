/* Covers check-generated.ts. The git-backed halves take an injected runner, so a
 * case can state a tracked/ignored pair without a repository behind it. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import {
  UNMARKED, UNTRACKED, matches, claimsGeneration,
  unmarkedProblems, trackingProblems, unmarkedCoverageProblems, introImportProblems,
} from './check-generated.ts';
import { ROOT_TS } from '../../build/react/build-react-package.ts';
import { ROOT_MODULES } from '../../build/react/build-demos.ts';
import { toPosix, relPosix } from '../../utils/posix-path.ts';

function tree(files: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'arena-generated-'));
  for (const [rel, body] of Object.entries(files) as [string, string][]) {
    const path = join(root, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body);
  }
  return root;
}

const runner = ({ tracked = [], ignored = [] }: { tracked?: string[]; ignored?: string[] }) =>
  (args: string[]) => {
  if (args[0] === 'ls-files') return tracked;
  if (args[0] === 'check-ignore') {
    const path = args[2] ?? '';
    return ignored.includes(path) ? [path] : [];
  }
  return [];
};

test('the two unmarked outputs are named by literal value, with a reason each', () => {
  assert.deepEqual(Object.keys(UNMARKED).sort(), ['assets/fonts/*.woff2', 'intro/support.js']);
  for (const [name, reason] of Object.entries(UNMARKED)) {
    assert.ok(reason.length > 40, `${name} carries no real reason`);
  }
});

test('every ignore pattern carries a reason, and each names a real tree', () => {
  assert.deepEqual(Object.keys(UNTRACKED).sort(), [
    'frameworks/angular/Api.generated.ts',
    'frameworks/angular/ArenaStyles.generated.ts',
    'frameworks/angular/LocaleDefaults.generated.ts',
    'frameworks/angular/Tokens.generated.ts',
    'frameworks/angular/components/**/*.classes.generated.ts',
    'frameworks/angular/components/**/*.demo.entry.generated.ts',
    'frameworks/angular/kitchen-sink/**/*.entry.generated.ts',
    'frameworks/angular/playground/PlaygroundCodec.generated.ts',
    'frameworks/react/AnchorActivation.generated.js',
    'frameworks/react/AnchoredPanel.generated.js',
    'frameworks/react/Api.generated.ts',
    'frameworks/react/ArenaLocale.generated.js',
    'frameworks/react/ArenaStyles.generated.js',
    'frameworks/react/ArenaStyles.generated.ts',
    'frameworks/react/DataVisuals.generated.js',
    'frameworks/react/Index.generated.ts',
    'frameworks/react/LocaleDefaults.generated.js',
    'frameworks/react/LocaleDefaults.generated.ts',
    'frameworks/react/Phrase.generated.js',
    'frameworks/react/StructuredData.generated.js',
    'frameworks/react/Theme.generated.js',
    'frameworks/react/Thresholds.generated.js',
    'frameworks/react/Tokens.generated.js',
    'frameworks/react/UseAnchoredPanel.generated.js',
    'frameworks/react/UseArenaContainerWidth.generated.js',
    'frameworks/react/UseDialogModal.generated.js',
    'frameworks/react/Vocabulary.generated.js',
    'frameworks/react/Vocabulary.generated.ts',
    'frameworks/react/VocabularyClass.generated.js',
    'frameworks/react/WarnOnce.generated.js',
    'frameworks/react/components/**/*.classes.generated.ts',
    'frameworks/react/components/**/*.demo.entry.generated.tsx',
    'frameworks/react/components/**/*.generated.js',
    'frameworks/react/components/**/*.manifest.generated.ts',
    'frameworks/react/kitchen-sink/**/*.entry.generated.tsx',
    'frameworks/react/kitchen-sink/**/*.generated.js',
    'frameworks/react/playground/*.generated.js',
    'frameworks/react/playground/PlaygroundCodec.generated.ts',
    'frameworks/react/vendor/*.generated.js',
    'frameworks/tailwind/Breakpoints.generated.css',
    'frameworks/tailwind/Utilities.generated.css',
    'frameworks/tailwind/components/**/*.classes.generated.ts',
    'frameworks/tailwind/components/**/*.manifest.generated.ts',
    'frameworks/tailwind/consume/Components.generated.css',
    'frameworks/tailwind/consume/Preflight.generated.css',
    'frameworks/tailwind/consume/Prelude.generated.css',
    'frameworks/tailwind/consume/components/**/*.styles.generated.css',
    'frameworks/tailwind/consume/hues/**/*.hues.generated.css',
    'frameworks/tailwind/consume/vocabulary/*.generated.css',
  ]);
  for (const [name, reason] of Object.entries(UNTRACKED)) {
    assert.ok(reason.length > 30, `${name} carries no real reason`);
  }
  assert.ok(!Object.keys(UNTRACKED).some((k) => k.includes('{')),
    'the matcher takes a glob and not a brace expansion, so a braced key would name nothing');
});

test('matches treats * as one segment and **/ as any depth', () => {
  assert.equal(matches('a/*.generated.js', 'a/B.generated.js'), true);
  assert.equal(matches('a/*.generated.js', 'a/b/C.generated.js'), false);
  assert.equal(matches('a/**/*.generated.js', 'a/b/c/D.generated.js'), true);
  assert.equal(matches('a/**/*.generated.js', 'a/B.generated.js'), true);
  assert.equal(matches('assets/fonts/*.woff2', 'assets/fonts/archivo-400.woff2'), true);
  assert.equal(matches('assets/fonts/*.woff2', 'assets/other/archivo-400.woff2'), false);
});

test('a claim of generation counts only as the file header', () => {
  assert.equal(claimsGeneration('/* GENERATED by x.mjs */\nconst a = 1;\n'), true);
  assert.equal(claimsGeneration('// GENERATED from dc-runtime\nconst a = 1;\n'), true);
  assert.equal(claimsGeneration("export const B = '/* GENERATED by x.mjs */';\n"), false);
  assert.equal(claimsGeneration('const a = 1;\n/* GENERATED by x.mjs */\n'), false);
});

test('an output claiming generation without the infix is a problem; UNMARKED excuses it', () => {
  const root = tree({
    'frameworks/react/A.js': '/* GENERATED by x.mjs */\nexport const a = 1;\n',
    'intro/support.js': '// GENERATED from dc-runtime/src/*.ts\nconst a = 1;\n',
    'frameworks/react/B.generated.js': '/* GENERATED by x.mjs */\nexport const b = 1;\n',
  });
  const problems = unmarkedProblems(root);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /frameworks\/react\/A\.js/);
  rmSync(root, { recursive: true });
});

test('a .generated. file that is neither tracked nor ignored reaches no clone', () => {
  const root = tree({ 'frameworks/react/A.generated.js': 'export const a = 1;\n' });
  const problems = trackingProblems(root, runner({}));
  assert.equal(problems.length, 1 + Object.keys(UNTRACKED).length,
    'the orphan, plus every UNTRACKED pattern this bare tree leaves unclaimed');
  assert.match(problems[0] ?? '', /neither tracked nor ignored/);
  rmSync(root, { recursive: true });
});

test('an ignored .generated. file with no UNTRACKED entry is a problem', () => {
  const root = tree({ 'frameworks/react/vendor/React.generated.js': 'export default 1;\n' });
  const rel = 'frameworks/react/vendor/React.generated.js';
  assert.deepEqual(
    trackingProblems(root, runner({ ignored: [rel] })).filter((p) => p.startsWith(rel)),
    [],
    'the shipped UNTRACKED table already covers the vendor bundle',
  );
  rmSync(root, { recursive: true });
});

test('a file both ignored and in the index is reported, since the index wins silently', () => {
  const root = tree({ 'frameworks/react/vendor/React.generated.js': 'export default 1;\n' });
  const rel = 'frameworks/react/vendor/React.generated.js';
  const problems = trackingProblems(root, runner({ tracked: [rel], ignored: [rel] }));
  assert.ok(problems.some((p) => /still in the index/.test(p)));
  rmSync(root, { recursive: true });
});

test('an UNMARKED entry matching no tracked file is stale and fails', () => {
  assert.equal(unmarkedCoverageProblems('.', runner({
    tracked: ['intro/support.js', 'assets/fonts/archivo-400.woff2'],
  })).length, 0);
  const stale = unmarkedCoverageProblems('.', runner({ tracked: ['intro/support.js'] }));
  assert.equal(stale.length, 1);
  assert.match(stale[0] ?? '', /assets\/fonts\/\*\.woff2/);
});

test('an intro sheet importing a file the index does not hold is reported, since the tag serves it unstyled', () => {
  const root = tree({
    'intro/styles.css': '@import "../contracts/a.css";\n@import url("../frameworks/b.generated.css");\n@import "https://example.org/c.css";\n',
  });
  const held = introImportProblems(root, runner({ tracked: ['intro/styles.css', 'contracts/a.css', 'frameworks/b.generated.css'] }));
  assert.deepEqual(held, []);
  const missing = introImportProblems(root, runner({ tracked: ['intro/styles.css', 'contracts/a.css'] }));
  assert.equal(missing.length, 1);
  assert.match(missing[0] ?? '', /frameworks\/b\.generated\.css/);
  rmSync(root, { recursive: true });
});

const REACT_ROOT = 'frameworks/react';

function importedRootModules(repo: string): string[] {
  const found = new Set<string>();
  const walk = (dir: string) => {
    for (const entry of readdirSync(join(repo, dir), { withFileTypes: true })) {
      const rel = `${dir}/${entry.name}`;
      if (entry.isDirectory()) walk(rel);
      else if (/\.tsx?$/.test(entry.name) && !/\.test\./.test(entry.name)) {
        const source = readFileSync(join(repo, rel), 'utf8');
        for (const m of source.matchAll(/\b(?:import|export)\s+(type\s+)?[^;'"]*?from\s+['"](\.[^'"]+)['"]|\bimport\s+['"](\.[^'"]+)['"]/g)) {
          if (m[1]) continue;
          const target = toPosix(join(dirname(rel), (m[2] ?? m[3]) as string));
          const name = relPosix(REACT_ROOT, target).replace(/\.(js|ts|tsx)$/, '');
          if (!target.startsWith(`${REACT_ROOT}/`) || name.startsWith('..') || name.includes('/')) continue;
          for (const ext of ['.ts', '.tsx']) {
            if (existsSync(join(repo, REACT_ROOT, name + ext))) found.add(name + ext);
          }
        }
      }
    }
  };
  walk(`${REACT_ROOT}/components`);
  return [...found].sort();
}

function unlistedRootModules(
  modules: string[], lists: { rootTs: string[]; rootModules: string[]; untracked: string[] },
): string[] {
  const problems: string[] = [];
  for (const name of modules) {
    const sibling = `${REACT_ROOT}/${name.includes('.generated.') ? name.replace(/\.tsx?$/, '.js') : name.replace(/\.tsx?$/, '.generated.js')}`;
    if (!lists.rootTs.includes(name))
      problems.push(`${name} is imported by a component but missing from ROOT_TS (scripts/build/react/build-react-package.ts)`);
    if (!lists.rootModules.includes(`${REACT_ROOT}/${name}`))
      problems.push(`${name} is imported by a component but missing from ROOT_MODULES (scripts/build/react/build-demos.ts)`);
    if (!lists.untracked.includes(sibling))
      problems.push(`${name} is imported by a component but its compiled sibling ${sibling} is missing from UNTRACKED (scripts/check/arena/check-generated.ts)`);
  }
  return problems;
}

test('a layer-root module a component imports is named in every list the build reads', () => {
  const modules = importedRootModules('.');
  assert.ok(modules.includes('Thresholds.ts') && modules.includes('WarnOnce.ts'),
    'the scan found no root module a component is known to import, so it reads the wrong tree');
  const lists = { rootTs: ROOT_TS, rootModules: ROOT_MODULES, untracked: Object.keys(UNTRACKED) };
  assert.deepEqual(unlistedRootModules(modules, lists), []);
});

test('a root module dropped from one list is reported with the module and the list', () => {
  const lists = {
    rootTs: ROOT_TS.filter((n) => n !== 'Thresholds.ts'),
    rootModules: ROOT_MODULES.filter((n) => !n.endsWith('/Thresholds.ts')),
    untracked: Object.keys(UNTRACKED).filter((k) => !k.endsWith('/Thresholds.generated.js')),
  };
  const problems = unlistedRootModules(['Thresholds.ts'], lists);
  assert.equal(problems.length, 3);
  for (const list of ['ROOT_TS', 'ROOT_MODULES', 'UNTRACKED'])
    assert.ok(problems.some((p) => p.includes('Thresholds.ts') && p.includes(list)), `${list} is not named`);
});
