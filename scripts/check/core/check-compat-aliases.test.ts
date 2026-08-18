import test from 'node:test';
import assert from 'node:assert/strict';
import { aliasesIn, collect, extra, missing, zeroAliasProblems } from './check-compat-aliases.ts';

test('an alias the layer defines and the rule does not name is a problem', () => {
  assert.deepEqual(missing(['mute', 'gold'], ['mute']), ['gold']);
});

test('an alias the rule names and the layer has dropped is a problem', () => {
  assert.deepEqual(extra(['mute'], ['mute', 'gone']), ['gone']);
});

test('the parse reads a definition and never a reference', () => {
  const found = aliasesIn(':root{--mute:color-mix(in oklab,var(--color-base-content) 62%,transparent);}');
  assert.deepEqual(found, ['mute'],
    'the palette key on the right of the colon is read rather than defined here');
});

test('a name written in prose above a block is not a definition', () => {
  const found = aliasesIn('/* maps --crimson and --gold onto the tokens */\n:root{--mute:x;}');
  assert.deepEqual(found, ['mute'],
    'the comment names two aliases and defines neither, and a parse that counted them would hold '
    + 'the rule to a list the file does not carry');
});

test('an empty result set is a failure rather than a clean pass', () => {
  assert.deepEqual(zeroAliasProblems(1), []);
  assert.equal(zeroAliasProblems(0).length, 1,
    'a stylesheet that parsed to nothing would otherwise report every alias the rule names as one '
    + 'the layer has dropped, which reads as a rule gone stale rather than as a broken parse');
});

test('the rule and the layer agree in this tree', () => {
  const problems = collect();
  assert.deepEqual(problems, [], problems.join('\n'));
});
