/* The four zero-result guards are the point of this suite: a bridge that stops being a
 * bridge must fail rather than pass by having nothing left to check. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bridgeSelectors, cdkClasses, importedSheets, checkBridge, publishedBridgeProblems } from './check-cdk.ts';
import { inlineCdkPrebuilt } from '../../lib/arena/package-assembly.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

const PREBUILT = readFileSync(
  join(repoRoot, 'node_modules', '@angular', 'cdk', 'overlay-prebuilt.css'), 'utf8',
);

const CSS = `
/* a comment naming .cdk-invented-by-the-comment and var(--invented-token) */
@import '@angular/cdk/overlay-prebuilt.css';

.cdk-overlay-container {
  z-index: var(--z-dropdown);
}
`;

const TOKENS = new Set(['z-dropdown']);
const RESOLVES = () => true;

test('bridgeSelectors reads the selector past the at-rule the same line group holds', () => {
  assert.deepEqual([...bridgeSelectors(CSS)], ['.cdk-overlay-container']);
});

test('cdkClasses ignores a class named only inside a comment', () => {
  assert.deepEqual([...cdkClasses(CSS)], ['cdk-overlay-container']);
});

test('importedSheets collects the stylesheet the bridge pulls into scope', () => {
  assert.deepEqual([...importedSheets(CSS)], ['@angular/cdk/overlay-prebuilt.css']);
});

test('the real bridge passes against the installed prebuilt sheet', () => {
  assert.deepEqual(checkBridge(CSS, PREBUILT, TOKENS, RESOLVES), []);
});

test('a cdk-* class the installed CDK does not define is reported, because a rename breaks the bridge silently', () => {
  const css = CSS.replace('.cdk-overlay-container {', '.cdk-overlay-kontainer {');
  const errs = checkBridge(css, PREBUILT, TOKENS, RESOLVES);
  assert.equal(errs.length, 1);
  assert.match(errs[0] ?? '', /\.cdk-overlay-kontainer/);
  assert.match(errs[0] ?? '', /matches nothing/);
});

test('a var() naming no Arena token is reported', () => {
  const errs = checkBridge(CSS, PREBUILT, new Set(), RESOLVES);
  assert.equal(errs.length, 1);
  assert.match(errs[0] ?? '', /var\(--z-dropdown\)/);
  assert.match(errs[0] ?? '', /resolves to nothing/);
});

test('an @import resolving to no file is reported, because the import is dropped in silence', () => {
  const errs = checkBridge(CSS, PREBUILT, TOKENS, () => false);
  assert.equal(errs.length, 1);
  assert.match(errs[0] ?? '', /renders unpositioned/);
});

test('a bridge with no rule at all fails rather than passing with nothing to check', () => {
  const errs = checkBridge('@import "@angular/cdk/overlay-prebuilt.css";\n', PREBUILT, TOKENS, RESOLVES);
  assert.ok(errs.some((e) => /overrides nothing is not a bridge/.test(e)));
  assert.ok(errs.some((e) => /names no cdk-\* class/.test(e)));
  assert.ok(errs.some((e) => /references no Arena token/.test(e)));
});

test('a bridge that stops importing the prebuilt sheet fails', () => {
  const errs = checkBridge(CSS.replace(/@import[^\n]*\n/, ''), PREBUILT, TOKENS, RESOLVES);
  assert.equal(errs.length, 1);
  assert.match(errs[0] ?? '', /imports no stylesheet/);
});

test('the oracle sees the container class the bridge exists to override', () => {
  assert.ok(cdkClasses(PREBUILT).has('cdk-overlay-container'));
});

const SOURCE_BRIDGE = readFileSync(join(repoRoot, 'frameworks', 'angular', 'theme', 'arena-cdk.css'), 'utf8');

const VERSION = '1.2.3';

test('publishedBridgeProblems accepts the inlined bridge and names each way a copy goes wrong', () => {
  const good = inlineCdkPrebuilt(SOURCE_BRIDGE, PREBUILT, VERSION);
  const problems = (copy: string) => publishedBridgeProblems(copy, SOURCE_BRIDGE, PREBUILT, VERSION);
  assert.deepEqual(problems(good), []);
  assert.ok(problems(SOURCE_BRIDGE).some((p) => p.includes('@import')), 'the raw source bridge');
  const drift = inlineCdkPrebuilt(SOURCE_BRIDGE, PREBUILT.replace('z-index: 1000', 'z-index: 999'), VERSION);
  assert.equal(problems(drift).length, 1, 'a prebuilt with one rule changed');
  const noOverride = good.replace('calc(var(--z-toast) - 10)', '1000');
  assert.equal(problems(noOverride).length, 1, 'the override removed');
  const reordered = `${PREBUILT}\n${SOURCE_BRIDGE.replace(/@import[^\n]*\n/, '')}`;
  assert.equal(problems(reordered).length, 1, 'the override ahead of the CDK rules');
  const withImport = `${good}\n@import '@angular/cdk/overlay-prebuilt.css';\n`;
  const both = problems(withImport);
  assert.equal(both.length, 2, 'prebuilt inlined and a bare @import left in');
  assert.ok(both.some((p) => p.includes('bare specifier')));
  assert.equal(problems(good.replace(VERSION, '9.9.9')).length, 1, 'an attribution naming another version');
});
