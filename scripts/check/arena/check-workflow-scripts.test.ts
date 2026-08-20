import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import {
  INSTALL, bareSpecifiers, entryScripts, jobProblems, workflowScriptProblems,
} from './check-workflow-scripts.ts';

function tree(files: Record<string, string>) {
  const base = mkdtempSync(join(tmpdir(), 'workflow-scripts-'));
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(dirname(join(base, rel)), { recursive: true });
    writeFileSync(join(base, rel), body);
  }
  return base;
}

test('a bare specifier is one the registry answers, and node: and a path are not', () => {
  const source = [
    "import { readFileSync } from 'node:fs';",
    "import { thing } from './thing.ts';",
    "import { transpileModule } from 'typescript';",
    "export { CSS_CHAIN } from '../lib/chain.ts';",
    "export * from 'style-dictionary';",
    "const late = await import('happy-dom');",
  ].join('\n');
  assert.deepEqual(bareSpecifiers(source), ['happy-dom', 'style-dictionary', 'typescript']);
});

test('a regular expression whose source is an import statement is not an import', () => {
  const source = [
    "import { join } from 'node:path';",
    "export const MANIFEST_IMPORT = /import manifest from '[^']*?([A-Za-z0-9]+)\\.generated[^']*'/;",
    "export const FROM = /(?:^|[;}])\\s*export\\b[^;'\"]*?\\bfrom\\s*[\"']([^\"']+)[\"']/gm;",
  ].join('\n');
  assert.deepEqual(bareSpecifiers(source), [],
    'every scan short of a parser reports the character class inside these as a package');
});

test('a script named on the command line is found, and one named through package.json too', () => {
  const scripts = {
    'build:release': 'bun scripts/graph/run-build.ts --assemble',
    'ci:summarize': 'bun run build:release && bun scripts/ci/arena/summarize-tests.ts',
  };
  assert.deepEqual(entryScripts('bun scripts/check/arena/check-all.ts --no-tests', scripts),
    ['scripts/check/arena/check-all.ts']);
  assert.deepEqual(entryScripts('bun run ci:summarize', scripts),
    ['scripts/ci/arena/summarize-tests.ts', 'scripts/graph/run-build.ts']);
  assert.deepEqual(entryScripts('git diff | bun scripts/ci/arena/changed-layers.ts >> "$OUT"', scripts),
    ['scripts/ci/arena/changed-layers.ts']);
});

test('two names that run each other are answered rather than hung on', () => {
  const scripts = { 'check:docs': 'bun run check:graph', 'check:graph': 'bun run check:docs && bun scripts/one.ts' };
  assert.deepEqual(entryScripts('bun run check:docs', scripts), ['scripts/one.ts'],
    'the names are real ones so the fixture hands nobody a command that does not exist');
});

test('a job that installs is not asked, and one that does not is asked of the whole closure', () => {
  const base = tree({
    'scripts/entry.ts': "import { helper } from './lib/helper.ts';\nexport const x = helper;\n",
    'scripts/lib/helper.ts': "import { transpileModule } from 'typescript';\nexport const helper = transpileModule;\n",
  });
  try {
    const guarded = ['jobs:', '  guard:', '    steps:', '      - run: bun scripts/entry.ts', ''].join('\n');
    const installed = ['jobs:', '  guard:', '    steps:', '      - run: bun install --frozen-lockfile',
      '      - run: bun scripts/entry.ts', ''].join('\n');

    const open = jobProblems('w.yml', guarded, {}, base);
    assert.equal(open.checked, 1);
    assert.equal(open.problems.length, 1);
    assert.match(open.problems[0]!, /job guard runs scripts\/entry\.ts/);
    assert.match(open.problems[0]!, /scripts\/lib\/helper\.ts imports typescript/);

    assert.deepEqual(jobProblems('w.yml', installed, {}, base), { problems: [], checked: 0 });
    assert.equal(INSTALL.test(installed), true);
    assert.equal(INSTALL.test(guarded), false);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('installing in one job says nothing about another', () => {
  const base = tree({ 'scripts/entry.ts': "import 'typescript';\n" });
  try {
    const text = ['jobs:', '  build:', '    steps:', '      - run: bun install --frozen-lockfile',
      '  route:', '    steps:', '      - run: bun scripts/entry.ts', ''].join('\n');
    const { problems } = jobProblems('w.yml', text, {}, base);
    assert.equal(problems.length, 1);
    assert.match(problems[0]!, /job route/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});

test('this repository holds to the rule, and the gate reaches its workflows to say so', () => {
  const { problems, scanned, checked } = workflowScriptProblems();
  assert.deepEqual(problems, []);
  assert.ok(scanned > 0, 'the gate found no workflow, so it proved nothing');
  assert.ok(checked > 0, 'no job here runs a script without installing, so the rule is unproven');
});
