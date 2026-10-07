/* The vocabulary a package carries for its audit, derived from the families and the manifests'
 * answers, since the audit inside a package cannot read either. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { vocabularyIndex, vocabularyIndexOf } from './vocabulary-index.ts';

test('every option is indexed with its family and reach, and every answering component with its families', () => {
  const index = vocabularyIndexOf(
    [{ family: 'fill', reach: 'box', description: 'd', default: 'arena-fit', variants: { 'arena-fill': '[--arena-fill-width:100%]', 'arena-fit': '[--arena-fill-width:fit-content]' } }],
    [{ component: 'ArenaButton', answers: ['fill'] }, { component: 'ArenaCard' }], 'https://x/p');
  assert.deepEqual(index, {
    page: 'https://x/p',
    classes: { 'arena-fill': { family: 'fill', reach: 'box', target: 'component' }, 'arena-fit': { family: 'fill', reach: 'box', target: 'component' } },
    answers: { ArenaButton: ['fill'] },
    options: { ArenaButton: ['arena-fill', 'arena-fit'] },
    defaults: { ArenaButton: { fill: 'arena-fit' } },
    axes: {},
    modals: [],
  });
});

test('a family with axes is indexed with them, so the audit can name a class and a property that decide one axis', () => {
  const index = vocabularyIndexOf(
    [{ family: 'grid-min', reach: 'box', description: 'd', variants: { 'arena-grid-min-sm': 'a' }, axis: '--arena-grid-min' },
      { family: 'skeleton', reach: 'box', description: 'd', variants: { 'arena-skeleton-line': 'a' }, axis: ['--arena-skeleton-width', '--arena-skeleton-height'] }], [], 'https://x/p');
  assert.deepEqual(index.axes, { 'grid-min': ['--arena-grid-min'], skeleton: ['--arena-skeleton-width', '--arena-skeleton-height'] });
});

test('an option of a markup family is indexed with target markup', () => {
  const index = vocabularyIndexOf(
    [{ family: 'stack', reach: 'box', target: 'markup', description: 'd', variants: { 'arena-stack': '[display:flex]' } }], [], 'https://x/p');
  assert.deepEqual(index.classes, { 'arena-stack': { family: 'stack', reach: 'box', target: 'markup' } });
});

test('an answers object narrows the options a component keeps', () => {
  const index = vocabularyIndexOf(
    [{ family: 'placement', reach: 'box', description: 'd', variants: { 'arena-placement-top': 'a', 'arena-placement-end': 'b' } }],
    [{ component: 'ArenaSheet', answers: [{ family: 'placement', options: ['arena-placement-end'], default: 'arena-placement-end' }] }], 'https://x/p');
  assert.deepEqual(index.answers, { ArenaSheet: ['placement'] });
  assert.deepEqual(index.options, { ArenaSheet: ['arena-placement-end'] });
  assert.deepEqual(index.defaults, { ArenaSheet: { placement: 'arena-placement-end' } });
});

test('an axis an option reads is composed with the class and leaves the axes, so the audit does not call the pair a conflict', () => {
  const index = vocabularyIndexOf(
    [{ family: 'skeleton', reach: 'box', description: 'd', variants: { 'arena-skeleton-line': '[--w:var(--arena-skeleton-width,100%)]' }, axis: ['--arena-skeleton-width', '--arena-skeleton-radius'] }], [], 'https://x/p');
  assert.deepEqual(index.axes, { skeleton: ['--arena-skeleton-radius'] });
});

test('a component whose binding binds a modal pattern, directly or in any case, is a modal of its own', () => {
  const index = vocabularyIndexOf([], [], 'https://x/p', [
    ['ArenaDialog', { pattern: 'dialog-modal' }],
    ['ArenaConfirm', { pattern: 'alertdialog' }],
    ['ArenaSheet', { cases: [{ name: 'modal', pattern: 'dialog-modal' }, { name: 'inline', pattern: 'region' }] }],
    ['ArenaMenu', { pattern: 'menu' }],
  ]);
  assert.deepEqual(index.modals, ['ArenaConfirm', 'ArenaDialog', 'ArenaSheet']);
});

test('the shipped index names the dialogs from their bindings', () => {
  const modals = vocabularyIndex().modals ?? [];
  assert.ok(modals.includes('ArenaDialog') && modals.includes('ArenaConfirmDialog'));
  assert.ok(!modals.includes('ArenaButton'));
});
