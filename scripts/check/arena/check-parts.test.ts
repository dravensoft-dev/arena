import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MANIFESTS, angularPartProblems, classSites, collect, partProblems, reactPartProblems,
  symmetryProblems, zeroPartProblems,
} from './check-parts.ts';

const CARD = { root: 'card', body: 'card.body' };

test('a slot rendered without its part is reported', () => {
  const problems = reactPartProblems('<div className={styles.body()} />', CARD, 'ArenaCard');
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /card\.body/);
});

test('a slot rendered with its part passes', () => {
  const text = '<div className={styles.body()} data-arena-part={manifest.parts.body} />';
  assert.deepEqual(reactPartProblems(text, CARD, 'ArenaCard'), []);
});

test('a part on one element does not answer for the same slot on another', () => {
  const text = '<div className={styles.body()} data-arena-part={manifest.parts.body} />'
    + '<p className={styles.body()} />';
  assert.equal(reactPartProblems(text, CARD, 'ArenaCard').length, 1,
    'the hook is a property of an element, and a plugin selects elements');
});

test('a class assembled in an object literal is an element too', () => {
  const bare = 'const shared = {\n  className: styles.root(),\n};';
  assert.equal(reactPartProblems(bare, CARD, 'ArenaCard').length, 1);
  const hooked = "const shared = {\n  className: styles.root(),\n  'data-arena-part': manifest.parts.root,\n};";
  assert.deepEqual(reactPartProblems(hooked, CARD, 'ArenaCard'), []);
});

test('the angular layer is read the same way, from an inline template', () => {
  const text = '<div [class]="styles().body()" [attr.data-arena-part]="parts.body"></div>';
  assert.deepEqual(angularPartProblems(text, CARD, 'ArenaCard'), []);
  assert.equal(angularPartProblems('<div [class]="styles().body()"></div>', CARD, 'ArenaCard').length, 1);
});

test('a class expression naming no slot asks for nothing', () => {
  assert.deepEqual(reactPartProblems('<i className={icon} />', CARD, 'ArenaCard'), []);
  assert.deepEqual(angularPartProblems('<i [class]="glyph"></i>', CARD, 'ArenaCard'), []);
});

test('an expression choosing between two slots is one element and takes one part', () => {
  const text = '<b className={n ? styles.body() : styles.root()} data-arena-part={manifest.parts.body} />';
  assert.deepEqual(reactPartProblems(text, CARD, 'ArenaCard'), [],
    'a variant of a slot is the same element drawn differently, and an element carries one part');
});

test('a class site is read to the end of the element it sits on', () => {
  const sites = classSites('<a className={styles.root()} href={to}>x</a>', 'react');
  assert.equal(sites.length, 1);
  assert.match(sites[0]?.span ?? '', /href=\{to\}/);
  assert.doesNotMatch(sites[0]?.span ?? '', /x<\/a>/);
});

test('every slot a manifest names reaches the dom in both layers', () => {
  assert.deepEqual(partProblems('ArenaCard'), []);
});

test('the whole tree holds', () => {
  const { problems } = collect();
  assert.deepEqual(problems, []);
});

test('a zero walk is a failure and not a clean pass', () => {
  assert.equal(zeroPartProblems(0).length, 1);
  assert.deepEqual(zeroPartProblems(MANIFESTS().length), []);
});

test('a part one layer reaches and the other does not is not one contract', () => {
  const problems = symmetryProblems('ArenaCard', new Set(['card', 'card.body']), new Set(['card']));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /react layer reaches card\.body/);
  assert.deepEqual(symmetryProblems('ArenaCard', new Set(['card']), new Set(['card'])), []);
});
