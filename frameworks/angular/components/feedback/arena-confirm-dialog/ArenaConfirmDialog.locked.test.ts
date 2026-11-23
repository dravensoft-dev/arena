/* isArenaConfirmLocked is the dialog's own rule for when the confirm button is locked. The focus
 * trap the dialog calls is tested at its module, in test/FocusTrap.test.ts. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { isArenaConfirmLocked } from './ArenaConfirmDialog';

test('isArenaConfirmLocked: unset requireText never locks', () => {
  assert.equal(isArenaConfirmLocked(undefined, ''), false);
  assert.equal(isArenaConfirmLocked(undefined, 'anything'), false);
});

test('isArenaConfirmLocked: an empty-string requireText never locks either -- the divergence from a bare-truthiness check', () => {
  assert.equal(isArenaConfirmLocked('', ''), false);
  assert.equal(isArenaConfirmLocked('', 'anything typed'), false);
});

test('isArenaConfirmLocked: locks until the trimmed typed value matches exactly', () => {
  assert.equal(isArenaConfirmLocked('Ardennes', ''), true);
  assert.equal(isArenaConfirmLocked('Ardennes', 'wrong'), true);
  assert.equal(isArenaConfirmLocked('Ardennes', 'Ardennes'), false);
  assert.equal(isArenaConfirmLocked('Ardennes', '  Ardennes  '), false, 'surrounding whitespace in what was typed must be trimmed');
});
