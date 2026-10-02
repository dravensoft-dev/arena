/* The vocabulary a package carries for its audit, derived from the families and the manifests'
 * answers, since the audit inside a package cannot read either. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { vocabularyIndexOf } from './vocabulary-index.ts';

test('every option is indexed with its family and reach, and every answering component with its families', () => {
  const index = vocabularyIndexOf(
    [{ family: 'fill', reach: 'box', description: 'd', default: 'arena-fit', variants: { 'arena-fill': '[--arena-fill-width:100%]', 'arena-fit': '[--arena-fill-width:fit-content]' } }],
    [{ component: 'ArenaButton', answers: ['fill'] }, { component: 'ArenaCard' }], 'https://x/p');
  assert.deepEqual(index, {
    page: 'https://x/p',
    classes: { 'arena-fill': { family: 'fill', reach: 'box' }, 'arena-fit': { family: 'fill', reach: 'box' } },
    answers: { ArenaButton: ['fill'] },
  });
});
