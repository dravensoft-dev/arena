/* A bridge that stops importing the prebuilt sheet, or starts declaring a rule, fails here. The published copy is held to the installed CDK byte for byte. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bridgeSelectors, importedSheets, checkBridge, publishedBridgeProblems } from './check-cdk.ts';
import { inlineCdkPrebuilt } from '../../lib/arena/package-assembly.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

const PREBUILT = readFileSync(
  join(repoRoot, 'node_modules', '@angular', 'cdk', 'overlay-prebuilt.css'), 'utf8',
);

const CSS = `
@import '@angular/cdk/overlay-prebuilt.css';

.cdk-overlay-container {
  z-index: var(--z-dropdown);
}
`;

const RESOLVES = () => true;

test('bridgeSelectors reads the selector past the at-rule the same line group holds', () => {
  assert.deepEqual([...bridgeSelectors(CSS)], ['.cdk-overlay-container']);
});

test('importedSheets collects the stylesheet the bridge pulls into scope', () => {
  assert.deepEqual([...importedSheets(CSS)], ['@angular/cdk/overlay-prebuilt.css']);
});

const NO_RULE = CSS.replace(/\n\.cdk-overlay-container \{[^}]*\}\n/, '');

test('the bridge imports the installed sheet and declares no rule', () => {
  const rows: { name: string; css: string; resolves: () => boolean; problems: RegExp[] }[] = [
    { name: 'the real bridge', css: SOURCE_BRIDGE, resolves: RESOLVES, problems: [] },
    { name: 'a bridge with a rule', css: CSS, resolves: RESOLVES, problems: [/\.cdk-overlay-container/] },
    { name: 'an import resolving to no file', css: NO_RULE, resolves: () => false, problems: [/resolves to no file/] },
    { name: 'a bridge with no import and no rule', css: NO_RULE.replace(/@import[^\n]*\n/, ''), resolves: RESOLVES, problems: [/imports no stylesheet/] },
  ];
  for (const row of rows) {
    const errs = checkBridge(row.css, row.resolves);
    assert.equal(errs.length, row.problems.length, `${row.name}: ${errs.join(' | ')}`);
    row.problems.forEach((re, i) => assert.match(errs[i] ?? '', re, row.name));
  }
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
  const withImport = `${good}\n@import '@angular/cdk/overlay-prebuilt.css';\n`;
  const both = problems(withImport);
  assert.equal(both.length, 2, 'prebuilt inlined and a bare @import left in');
  assert.ok(both.some((p) => p.includes('bare specifier')));
  assert.equal(problems(good.replace(VERSION, '9.9.9')).length, 1, 'an attribution naming another version');
});
