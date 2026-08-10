import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extensionName, extensionProblems, declarationProblems, zeroExtensionProblem, collect,
} from './check-extensions.ts';

const ROLES = {
  'r-surface': { $type: 'dimension' },
  'bw-surface': { $type: 'dimension' },
  'dur-hover': { $type: 'duration' },
};

const ok = { 'r-surface': { $type: 'dimension', $value: '{r.xl}', $description: 'why' } };

test('the name is the middle segment of the file name', () => {
  assert.equal(extensionName('contracts/design/extension.expressive.json'), 'expressive');
});

test('an extension overriding a role is accepted', () => {
  assert.deepEqual(extensionProblems('expressive', ok, ROLES), []);
});

test('an extension overriding something that is not a role fails, naming the token', () => {
  const tokens = { 'color-primary': { $type: 'color', $value: '#fff', $description: 'why' } };
  const problems = extensionProblems('expressive', tokens, ROLES);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /color-primary/);
});

test('an extension reaching for a raw scale step fails, because a scale is not an extension to move', () => {
  const tokens = { 'r-lg': { $type: 'dimension', $value: '{r.xl}', $description: 'why' } };
  assert.match(extensionProblems('expressive', tokens, ROLES)[0] ?? '', /r-lg/);
});

test('a type that disagrees with the role it overrides fails, so the two cannot drift', () => {
  const tokens = { 'dur-hover': { $type: 'dimension', $value: '{dur.mid}', $description: 'why' } };
  assert.match(extensionProblems('expressive', tokens, ROLES)[0] ?? '', /dimension.*duration|duration.*dimension/);
});

test('a token moved without a reason fails, because an extension is a set of decisions', () => {
  const tokens = { 'r-surface': { $type: 'dimension', $value: '{r.xl}' } };
  assert.match(extensionProblems('expressive', tokens, ROLES)[0] ?? '', /\$description/);
});

test('an extension that moves nothing fails rather than passing vacuously', () => {
  assert.match(extensionProblems('empty', {}, ROLES)[0] ?? '', /no role/i);
});

test('a name that is not kebab-case fails, since it becomes a class', () => {
  assert.match(extensionProblems('Expressive', ok, ROLES)[0] ?? '', /kebab/i);
});

test('an extension the generator does not emit fails, because the file alone paints nothing', () => {
  const problems = declarationProblems(['expressive'], [{ selector: ':root', source: 'roles.json' }]);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /\.arena-expressive/);
});

test('an extension declared under the matching selector is accepted', () => {
  const blocks = [{ selector: '.arena-expressive', source: 'extension.expressive.json' }];
  assert.deepEqual(declarationProblems(['expressive'], blocks), []);
});

test('a generator block naming an extension file that does not exist fails as the other half of the join', () => {
  const blocks = [{ selector: '.arena-gone', source: 'extension.gone.json' }];
  assert.match(declarationProblems([], blocks)[0] ?? '', /extension\.gone\.json/);
});

test('zeroExtensionProblem fails on an empty walk rather than reporting a clean pass', () => {
  assert.match(zeroExtensionProblem([]) ?? '', /0 extension/i);
});

test('the real tree holds: every shipped extension moves roles only, and the generator emits each one', () => {
  assert.deepEqual(collect(), []);
});

test('an extension re-valuing an fs step is accepted, because the type ladder is already a set of roles', () => {
  const tokens = { 'fs-display': { $type: 'dimension', $value: { value: 80, unit: 'px' }, $description: 'why' } };
  assert.deepEqual(extensionProblems('expressive', tokens, ROLES), []);
});

test('an fs step still needs a reason, like any other move', () => {
  const tokens = { 'fs-display': { $type: 'dimension', $value: { value: 80, unit: 'px' } } };
  assert.match(extensionProblems('expressive', tokens, ROLES)[0] ?? '', /\$description/);
});

test('an fs step declared as something other than a dimension fails', () => {
  const tokens = { 'fs-display': { $type: 'duration', $value: '{dur.mid}', $description: 'why' } };
  assert.match(extensionProblems('expressive', tokens, ROLES)[0] ?? '', /dimension/);
});

test('a token that merely starts with fs is not an fs step', () => {
  const tokens = { 'fsx-display': { $type: 'dimension', $value: { value: 80, unit: 'px' }, $description: 'why' } };
  assert.match(extensionProblems('expressive', tokens, ROLES)[0] ?? '', /fsx-display/);
});

test('an extension named none fails, because none is how a consumer says it wants no extension', () => {
  assert.match(extensionProblems('none', ok, ROLES)[0] ?? '', /none/);
});

test('an extension named default is ordinary, since default is not a word the config gives meaning to', () => {
  assert.deepEqual(extensionProblems('default', ok, ROLES), []);
});
