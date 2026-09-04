/* The cross-check against the CSS chain lives here rather than beside the list, because the
 * guard's own CLI must import nothing outside node: and this tree: it runs in a job with no
 * install. A suite already reaches the assembler, and running one costs a job nothing. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  PACKAGE_INPUTS, PROSE_NAMES, SHARED_INPUTS, carried, carries, pathspecs,
} from './package-inputs.ts';
import { BEHAVIOUR_DIR, CSS_CHAIN, CLI_BINS, excluded } from '../../lib/arena/package-assembly.ts';
import { EXCLUDED_NAMES, EXCLUDED_PATTERNS } from '../../lib/arena/package-exclusions.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

export function uncoveredChainEntries(inputs: Record<string, string> = SHARED_INPUTS, chain = CSS_CHAIN) {
  const prefixes = Object.keys(inputs);
  return chain
    .map((c) => c.from)
    .filter((from): from is string => from !== undefined)
    .filter((from) => !prefixes.some((p) => (p.endsWith('/') ? from.startsWith(p) : from === p)));
}

test('every file the CSS chain copies is covered, so a chain that grows fails here', () => {
  assert.ok(CSS_CHAIN.length > 0);
  assert.deepEqual(uncoveredChainEntries(), []);
  assert.deepEqual(
    uncoveredChainEntries({ 'contracts/design/': 'half of it' }, CSS_CHAIN),
    CSS_CHAIN.map((c) => c.from).filter((f) => f !== undefined && !f.startsWith('contracts/design/')),
  );
});

test('the CLI each package ships as its bin is covered', () => {
  for (const name of Object.keys(CLI_BINS)) {
    assert.ok(`scripts/generate/core/${name}/` in SHARED_INPUTS,
      `${name} ships in both packages and a change to it would not trip the republish guard`);
    assert.ok(existsSync(join(repoRoot, 'scripts', 'generate', 'core', name)),
      'copyCli reads this directory, and the guard names it by that path');
  }
});

test('the behaviour contracts both packages carry are covered', () => {
  assert.ok(`${BEHAVIOUR_DIR}/` in SHARED_INPUTS,
    'copyBehaviourContracts writes this directory into contracts/behaviour/ of both packages, so a '
    + 'contract edited alone changes both tarballs and must reach the guard');
  assert.ok(existsSync(join(repoRoot, BEHAVIOUR_DIR)));
});

test('each package names its own layer, and both name the Tailwind layer they draw from', () => {
  assert.ok(pathspecs('react').includes('frameworks/react/'));
  assert.ok(pathspecs('angular').includes('frameworks/angular/'));
  assert.ok(pathspecs('angular').includes('frameworks/tailwind/'));
  assert.ok(pathspecs('react').includes('frameworks/tailwind/'),
    'the modules React compiles are emitted there and are gitignored, so a manifest edit moves '
    + 'what the package ships while nothing tracked under frameworks/react/ moves');
  assert.ok(!pathspecs('react').includes('frameworks/angular/'), 'React carries nothing of the Angular layer');
});

test('the version file is no input, or the guard could never answer that nothing moved', () => {
  for (const layer of Object.keys(PACKAGE_INPUTS)) {
    assert.ok(!pathspecs(layer).includes('.claude-plugin/plugin.json'),
      `${layer}: the guard is reached only when the registry disagrees with that file, so naming `
      + 'it here puts a changed file in every diff and no release could ever leave a package alone');
  }
});

test('every path a guard would hand to git exists, so a rename fails here rather than narrowing it', () => {
  for (const layer of Object.keys(PACKAGE_INPUTS)) {
    for (const spec of pathspecs(layer)) {
      assert.ok(existsSync(join(repoRoot, spec)), `${layer}: ${spec} names nothing`);
    }
  }
});

test('every entry carries a reason', () => {
  for (const [layer, inputs] of Object.entries(PACKAGE_INPUTS)) {
    for (const [spec, reason] of Object.entries(inputs)) {
      assert.ok(reason && reason.length > 10, `${layer}: ${spec} has no usable reason`);
    }
  }
});

test('a layer no package is assembled from is refused rather than answered with nothing', () => {
  assert.throws(() => pathspecs('tailwind'), /no package is assembled/);
});

test('the assembler decides what a directory spec carries, so a rule it grows narrows the guard too', () => {
  assert.ok(EXCLUDED_PATTERNS.length > 0);
  for (const name of ['ArenaTable.slice.dom.test.tsx', 'ArenaButton.card.html']) {
    assert.equal(excluded(name), true, name);
    assert.equal(carries(`frameworks/react/components/display/arena-x/${name}`, 'react'), false, name);
  }
  for (const dir of EXCLUDED_NAMES) {
    assert.equal(carries(`frameworks/react/${dir}/Thing.tsx`, 'react'), false, dir);
  }
});

test('a prompt republishes the package that carries it, and only that one', () => {
  const prompt = 'frameworks/react/components/display/arena-tag/ArenaTag.prompt.md';
  assert.equal(excluded('ArenaTag.prompt.md'), true,
    'a prompt does not ship next to the component it documents');
  assert.equal(carries(prompt, 'mcp'), true,
    'it ships under agent/react/ of the server, so an edit to one has to republish that package');
  assert.equal(carries(prompt, 'react'), false,
    'and the component package carries no prose, so nothing there moved');
  assert.equal(carries('frameworks/angular/INDEX.md', 'mcp'), true,
    'the server carries both layers, so an index of either one is an input of it');
  assert.equal(carries('skills/design/SKILL.md', 'mcp'), true,
    'and so is the router, which no component package carries any more');
});

test('a spec naming a file is read rather than walked, so its own directory name cannot drop it', () => {
  assert.ok(excluded('build'), 'the assembler skips a directory called build, which is the trap');
  assert.equal(carries('scripts/build/react/build-react-package.ts', 'react'), true,
    'the assembler is an input of the package it assembles, and it lives under scripts/build/');
  assert.equal(carries('scripts/build/angular/build-angular-package.ts', 'angular'), true);
});

test('prose about a directory is not a reason to republish, and PACKAGE.md is not prose', () => {
  for (const [name, reason] of Object.entries(PROSE_NAMES)) {
    assert.ok(reason.length > 10, `${name} has no usable reason`);
    assert.equal(carries(`frameworks/react/components/display/${name}`, 'react'), false, name);
    assert.equal(carries(`contracts/design/${name}`, 'react'), false, name);
  }
  assert.ok(!('PACKAGE.md' in PROSE_NAMES),
    'each assembler copies PACKAGE.md in as the package README, so it is an input');
  assert.equal(carries('frameworks/react/PACKAGE.md', 'react'), true);
});

test('a path no spec reaches is not carried, so a wider diff cannot leak in', () => {
  assert.equal(carries('README.md', 'react'), false);
  assert.equal(carries('.claude-plugin/plugin.json', 'react'), false);
  assert.equal(carries('frameworks/angular/index.ts', 'react'), false);
  assert.deepEqual(carried(['README.md', 'frameworks/react/index.ts', ''], 'react'), ['frameworks/react/index.ts']);
});

test('the contracts package inherits nothing shared, because most of it is false for a bag of JSON', () => {
  const specs = pathspecs('contracts');
  for (const shared of ['scripts/generate/core/arena-to-prod/', 'scripts/lib/arena/component-map.ts',
    'scripts/lib/arena/package-exclusions.ts', 'contracts/design-generated/']) {
    assert.ok(!specs.includes(shared),
      `${shared} is in SHARED_INPUTS and the contracts package carries no stylesheet, no CLI and no `
      + 'component map, so inheriting it would republish a package whose payload did not change');
  }
  assert.ok(specs.includes('contracts/api/'), 'the API level ships in this package and in neither other');
  assert.ok(specs.includes('scripts/build/arena/build-contracts-package.ts'), 'its assembler decides its payload');
  assert.ok(!specs.some((s) => s.startsWith('frameworks/')),
    'it is assembled from no layer at all, which is what makes it the one package a platform target reads');
});

test('a release that moved a component and no contract publishes no contracts', () => {
  const moved = [
    'frameworks/react/components/forms/arena-button/ArenaButton.tsx',
    'frameworks/tailwind/components/forms/arena-button/ArenaButton.manifest.json',
    'contracts/AGENTS.md',
    'contracts/design/AGENTS.md',
  ];
  assert.deepEqual(carried(moved, 'contracts'), [],
    'the prose under contracts/ is carried by no package, and nothing under frameworks/ reaches this one');
  assert.ok(carried(moved, 'react').length > 0, 'the same diff does move what the React package carries');
});

test('a contract moving is what publishes it', () => {
  assert.deepEqual(
    carried(['contracts/design/spacing.json', 'contracts/behaviour/button.json',
      'contracts/api/components/ArenaButton.json', 'contracts/NPM.md'], 'contracts'),
    ['contracts/design/spacing.json', 'contracts/behaviour/button.json',
      'contracts/api/components/ArenaButton.json', 'contracts/NPM.md'],
  );
});

test('the throw names a package rather than a layer, because the third is not one', () => {
  assert.throws(() => pathspecs('mobile'), /no package is assembled under the name "mobile"/);
});
