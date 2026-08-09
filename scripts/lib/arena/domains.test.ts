import test from 'node:test';
import assert from 'node:assert/strict';
import { basename, join, relative } from 'node:path';
import { relPosix } from '../../utils/posix-path.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { DOMAINS, SCRIPT_EXTENSIONS, SUITE_EXTENSIONS, STAYS_JAVASCRIPT,
  domainOfTestPath, isScript, isSuite } from './domains.ts';
import { LAYERS } from './layers.ts';
import { repoRoot } from './repo-root.ts';

const suitesUnder = (dir: string) => walkFiles(dir).filter((full) => isSuite(basename(full)));

test('the five domains are the grid the repository is sorted by, and every layer is one of them', () => {
  assert.deepEqual(DOMAINS, ['core', 'react', 'angular', 'tailwind', 'arena']);
  for (const layer of LAYERS) assert.ok(DOMAINS.includes(layer), `${layer} is not a domain`);
});

test('a script suite is classified by the domain directory it sits in, whatever its phase', () => {
  assert.equal(domainOfTestPath('scripts/lib/arena/domains.test.ts'), 'arena');
  assert.equal(domainOfTestPath('scripts/check/tailwind/check-radius-tokens.test.ts'), 'tailwind');
  assert.equal(domainOfTestPath('scripts/build/react/build-demos.test.ts'), 'react');
  assert.equal(domainOfTestPath('scripts/generate/core/fetch-fonts.test.ts'), 'core');
  assert.equal(domainOfTestPath('scripts/ci/arena/summarize-tests.test.ts'), 'arena');
});

test('a util sits under no phase and is arena, which is what belongs to no one layer means', () => {
  assert.equal(domainOfTestPath('scripts/utils/walk-files.test.ts'), 'arena');
  assert.equal(domainOfTestPath('scripts/utils/read-file.test.ts'), 'arena');
  assert.equal(domainOfTestPath('/runner/work/arena/arena/scripts/utils/walk-files.test.ts'), 'arena',
    'a junit report names the file a runner wrote, and it may name it absolutely');
  assert.equal(DOMAINS.includes('utils'), false,
    'utils is a directory and not a sixth domain: a domain states the vocabulary a module speaks '
    + 'and a util speaks none, which is why it carries no grid and lands in the one domain that '
    + 'already means it belongs to no layer in particular');
});

test('a framework suite is classified by its layer, DOM split and category depth included', () => {
  assert.equal(domainOfTestPath('frameworks/react/components/forms/arena-button/ArenaButton.test.tsx'), 'react');
  assert.equal(domainOfTestPath('frameworks/react/components/forms/arena-input/ArenaInput.dom.test.tsx'), 'react');
  assert.equal(domainOfTestPath('frameworks/react/test/UseDialogModal.dom.test.tsx'), 'react');
});

test("the Angular suites run from the emit, and the emit is still the Angular layer's", () => {
  assert.equal(domainOfTestPath('frameworks/angular/build/test/test/Harness.test.js'), 'angular');
  assert.equal(
    domainOfTestPath('frameworks/angular/build/test/components/forms/arena-button/ArenaButton.a11y.test.js'),
    'angular',
  );
});

test('an absolute path is classified, because a junit report names the files a runner wrote', () => {
  assert.equal(domainOfTestPath('/runner/work/arena/arena/frameworks/react/a.test.tsx'), 'react');
  assert.equal(domainOfTestPath('/runner/work/arena/arena/scripts/lib/core/serialize-token.test.ts'), 'core');
});

test('a checkout under a directory of an anchor name does not decide every path in the run', () => {
  assert.equal(domainOfTestPath('/home/dev/scripts/checkouts/frameworks/tailwind/a.test.mjs'), 'tailwind');
});

test('a path belonging to no domain is null rather than guessed', () => {
  assert.equal(domainOfTestPath('README.md'), null);
  assert.equal(domainOfTestPath('contracts/api/components/ArenaButton.json'), null);
  assert.equal(domainOfTestPath('scripts/serve.ts'), null);
  assert.equal(domainOfTestPath('frameworks/Components.json'), null);
});

test('every suite under scripts/ classifies, so the summary can never silently drop one', () => {
  const suites = suitesUnder(join(repoRoot, 'scripts'));
  assert.ok(suites.length > 0, 'a walk with nothing to walk proves nothing');
  const unclassified = suites
    .map((p) => relative(repoRoot, p))
    .filter((rel: string) => domainOfTestPath(rel) === null);
  assert.deepEqual(unclassified, []);
});

test('a suite is TypeScript, and a script is what is left over in either extension', () => {
  for (const name of ['a.test.ts', 'check-docs.test.ts'])
    assert.equal(isSuite(name), true, `${name} is a suite`);
  for (const name of ['a.test.mjs', 'a.mjs', 'a.ts', 'serve.ts', 'ArenaButton.test.tsx', 'notes.md'])
    assert.equal(isSuite(name), false, `${name} is not a suite this tree runs`);

  for (const name of ['a.mjs', 'a.ts', 'serve.ts'])
    assert.equal(isScript(name), true, `${name} is a script`);
  for (const name of ['a.test.ts', 'notes.md', 'Components.json'])
    assert.equal(isScript(name), false, `${name} is not a script`);

  assert.equal(isScript('a.test.mjs'), true,
    'no suite is JavaScript any more, so this name is a script, and the walk that proves '
    + 'specifiers must still reach it rather than skipping it as a suite it is not');
});

test('the two predicates never both hold, or a file would be scanned as its own suite', () => {
  for (const name of ['a.mjs', 'a.ts', 'a.test.mjs', 'a.test.ts', 'x.md'])
    assert.equal(isScript(name) && isSuite(name), false, name);
});

test('the two lists say what may still be JavaScript and what may not', () => {
  assert.deepEqual(SUITE_EXTENSIONS, ['.ts']);
  assert.deepEqual(SCRIPT_EXTENSIONS, ['.ts', '.mjs'],
    'dropping .mjs here would take the four modules on the record out of every scan that '
    + 'proves a specifier resolves, which is coverage lost rather than a migration finished');
});

test('a .ts path classifies by its directory, so the domain survives the rename', () => {
  assert.equal(domainOfTestPath('scripts/check/tailwind/check-radius-tokens.test.ts'), 'tailwind');
  assert.equal(domainOfTestPath('scripts/lib/arena/domains.test.ts'), 'arena');
});

const mjsUnder = (dir: string) => walkFiles(dir).filter((full) => full.endsWith('.mjs'));

test('every JavaScript left under scripts/ is one of the four on the record', () => {
  const left = mjsUnder(join(repoRoot, 'scripts'))
    .map((p) => relPosix(repoRoot, p))
    .sort();
  assert.deepEqual(left, [...STAYS_JAVASCRIPT.keys()].sort(),
    'a .mjs here is either a file the migration missed or a fifth exception nobody argued for; '
    + 'both are decisions, and neither is a default');
  for (const [rel, reason] of STAYS_JAVASCRIPT)
    assert.ok(reason.length > 40, `${rel} is exempt and the record does not say why`);
});

test('no suite is JavaScript, which is the claim the narrowed suffix rests on', () => {
  const suites = mjsUnder(join(repoRoot, 'scripts')).filter((p) => p.includes('.test.'));
  assert.deepEqual(suites, [],
    'isSuite reads .ts alone now, so a .test.mjs would run in neither runner and be counted by '
    + 'no domain; nothing loads a suite, so nothing can earn the exception the four modules did');
  assert.deepEqual(SUITE_EXTENSIONS, ['.ts']);
});
