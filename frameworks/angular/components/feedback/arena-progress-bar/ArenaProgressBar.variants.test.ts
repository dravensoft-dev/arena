import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaProgressBarStyles } from './ArenaProgressBar.variants';


test('indeterminate is a group on the track and on the ring fill', () => {
  assert.notEqual(arenaProgressBarStyles({ indeterminate: true }).track(), arenaProgressBarStyles({ indeterminate: false }).track());
  assert.notEqual(arenaProgressBarStyles({ indeterminate: true }).ringFill(), arenaProgressBarStyles({ indeterminate: false }).ringFill());
});
