/* A component keeps only the tokens of its own vocabulary, whatever built the string, so a
 * template literal cannot carry a utility past the type. Each dropped token warns once, naming
 * the component and what it does answer. An empty result renders no class attribute change. */
import test, { afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { arenaClassName } from './VocabularyClass.ts';
import { forgetArenaWarnings } from './WarnOnce.ts';

const ALLOWED = ['arena-fill', 'arena-fit'];
const warnings: string[] = [];
const original = console.warn;
console.warn = (message: string) => { warnings.push(message); };
afterEach(() => { warnings.length = 0; forgetArenaWarnings(); });
test.after(() => { console.warn = original; });

test('no class of the adopter leaves the base exactly as it was', () => {
  assert.equal(arenaClassName('ArenaButton', 'arena-button__root', undefined, ALLOWED), 'arena-button__root');
  assert.equal(arenaClassName('ArenaButton', undefined, '', ALLOWED), undefined);
});

test('a vocabulary class is appended after the base', () => {
  assert.equal(arenaClassName('ArenaButton', 'arena-button__root', 'arena-fill', ALLOWED), 'arena-button__root arena-fill');
});

test('a template string mixing a utility keeps the vocabulary token, drops the utility and warns once naming it', () => {
  const built = `arena-fill ${'mt-4'}`;
  assert.equal(arenaClassName('ArenaButton', 'arena-button__root', built, ALLOWED), 'arena-button__root arena-fill');
  arenaClassName('ArenaButton', 'arena-button__root', built, ALLOWED);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0] ?? '', /ArenaButton dropped the class "mt-4".*answers arena-fill, arena-fit/);
});

test('a component answering nothing drops every token and says it answers none', () => {
  assert.equal(arenaClassName('ArenaCard', 'arena-card__root', 'arena-fill', []), 'arena-card__root');
  assert.match(warnings[0] ?? '', /answers none/);
});
