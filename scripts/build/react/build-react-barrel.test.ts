import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  componentModules, barrel, buildBarrel, zeroComponentProblems,
  missingSourceProblems, duplicateExportProblems, HELPERS, TYPE_ONLY, ROOT_PRIVATE, BANNER,
} from './build-react-barrel.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';

function layer(components: Record<string, string>) {
  const root = mkdtempSync(join(tmpdir(), 'arena-barrel-'));
  for (const [path, body] of Object.entries(components) as [string, string][]) {
    const full = join(root, 'frameworks', 'react', path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, body);
  }
  return root;
}

test('a component directory becomes one export, named from its kebab directory', () => {
  const root = layer({
    'components/forms/arena-icon-button/ArenaIconButton.jsx': 'export function ArenaIconButton() {}',
    'components/forms/arena-icon-button/ArenaIconButton.d.ts': 'export declare function ArenaIconButton(): JSX.Element;',
  });
  assert.deepEqual(componentModules(root), [
    { component: 'ArenaIconButton', path: './components/forms/arena-icon-button/ArenaIconButton', ext: '.jsx' },
  ]);
  rmSync(root, { recursive: true });
});

test('components come out sorted by category then directory, so the file has one stable order', () => {
  const root = layer({
    'components/forms/arena-button/ArenaButton.jsx': 'export function ArenaButton() {}',
    'components/forms/arena-button/ArenaButton.d.ts': '',
    'components/display/arena-tag/ArenaTag.jsx': 'export function ArenaTag() {}',
    'components/display/arena-tag/ArenaTag.d.ts': '',
    'components/display/arena-avatar/ArenaAvatar.jsx': 'export function ArenaAvatar() {}',
    'components/display/arena-avatar/ArenaAvatar.d.ts': '',
  });
  assert.deepEqual(componentModules(root).map((m) => m.component), ['ArenaAvatar', 'ArenaTag', 'ArenaButton']);
  rmSync(root, { recursive: true });
});

test('a helper that is not a component is never exported, because it is not a directory', () => {
  const root = layer({
    'components/navigation/arena-side-nav/ArenaSideNav.jsx': 'export function ArenaSideNav() {}',
    'components/navigation/arena-side-nav/ArenaSideNav.d.ts': '',
    'components/navigation/arena-side-nav/SideNavInject.jsx': 'export function arenaInjectInto() {}',
  });
  assert.deepEqual(componentModules(root).map((m) => m.component), ['ArenaSideNav']);
  rmSync(root, { recursive: true });
});

test('the barrel keeps whichever source extension each module is written in', () => {
  const jsx = barrel([{ component: 'ArenaTag', path: './components/display/arena-tag/ArenaTag', ext: '.jsx' }]);
  assert.match(jsx, /export \* from '\.\/components\/display\/arena-tag\/ArenaTag\.jsx';/);
  const tsx = barrel([{ component: 'ArenaBadge', path: './components/display/arena-badge/ArenaBadge', ext: '.tsx' }]);
  assert.match(tsx, /export \* from '\.\/components\/display\/arena-badge\/ArenaBadge\.tsx';/);
  for (const helper of HELPERS) assert.match(jsx, new RegExp(`export \\* from '\\./${helper}\\.(js|ts)';`));
});

test('the contract types lead, and as a type-only export, so the runtime emit drops them', () => {
  const one = barrel([{ component: 'ArenaTag', path: './components/display/arena-tag/ArenaTag', ext: '.tsx' }]);
  for (const t of TYPE_ONLY) {
    assert.match(one, new RegExp(`export type \\* from '\\./${t}\\.ts';`));
    assert.ok(one.indexOf(`'./${t}.ts'`) < one.indexOf('/arena-tag/ArenaTag'));
  }
  assert.ok(one.startsWith(BANNER));
});

test('an empty tree is a failure rather than an empty barrel', () => {
  assert.equal(zeroComponentProblems(0).length, 1);
  assert.match(zeroComponentProblems(0)[0] ?? '', /an empty barrel is a failure, not a clean pass/);
  assert.deepEqual(zeroComponentProblems(1), []);
});

test('a component with no source, or no types, is named rather than skipped', () => {
  const root = layer({ 'components/display/arena-tag/ArenaTag.jsx': 'export function ArenaTag() {}' });
  const problems = missingSourceProblems(componentModules(root), root);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /ArenaTag: no .*ArenaTag\.d\.ts beside the \.jsx, so the package would ship it untyped/);
  rmSync(root, { recursive: true });
});

test('a .tsx carries its own types, so it is not asked for a hand-written .d.ts', () => {
  const root = layer({ 'components/display/arena-badge/ArenaBadge.tsx': 'export function ArenaBadge() {}' });
  assert.deepEqual(componentModules(root), [
    { component: 'ArenaBadge', path: './components/display/arena-badge/ArenaBadge', ext: '.tsx' },
  ]);
  assert.deepEqual(missingSourceProblems(componentModules(root), root), []);
  rmSync(root, { recursive: true });
});

test('a directory holding neither extension is named, rather than exporting nothing quietly', () => {
  const root = layer({ 'components/display/arena-tag/ArenaTag.prompt.md': '# ArenaTag\n' });
  const problems = missingSourceProblems(componentModules(root), root);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /no .*ArenaTag\.jsx and no .*ArenaTag\.tsx, so the barrel would export nothing/);
  rmSync(root, { recursive: true });
});

test('two components exporting one name is caught, because export * would shadow one', () => {
  const root = layer({
    'components/display/arena-tag/ArenaTag.jsx': 'export function ArenaTag() {}\nexport const FIT = 3;',
    'components/display/arena-tag/ArenaTag.d.ts': '',
    'components/forms/arena-button/ArenaButton.jsx': 'export function ArenaButton() {}\nexport const FIT = 4;',
    'components/forms/arena-button/ArenaButton.d.ts': '',
  });
  const problems = duplicateExportProblems(componentModules(root), root);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /FIT is exported by both ArenaTag and ArenaButton/);
  rmSync(root, { recursive: true });
});

test('Tokens.generated stays out, and ROOT_PRIVATE says why', () => {
  const { files } = buildBarrel(repoRoot);
  for (const content of files.values()) assert.doesNotMatch(content, /Tokens\.generated/);
  assert.deepEqual([...ROOT_PRIVATE.keys()], ['Tokens.generated', 'RootScale']);
  assert.match(ROOT_PRIVATE.get('Tokens.generated') ?? '', /re-theme/);
  assert.match(ROOT_PRIVATE.get('RootScale') ?? '', /arenaReadBreakpoint/);
});

test('the repository builds a barrel over every component it has, and no problems', () => {
  const { problems, count, files } = buildBarrel(repoRoot);
  assert.deepEqual(problems, []);
  assert.ok(count > 0);
  assert.equal(files.size, 1);
});
