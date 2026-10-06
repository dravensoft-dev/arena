import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaProgressBarStyles } from './ArenaProgressBar.variants';


test('indeterminate is a group on the track and on the ring fill', () => {
  assert.notEqual(JSON.stringify(arenaProgressBarStyles({ indeterminate: true }).$data.track()), JSON.stringify(arenaProgressBarStyles({ indeterminate: false }).$data.track()));
  assert.notEqual(JSON.stringify(arenaProgressBarStyles({ indeterminate: true }).$data.ringFill()), JSON.stringify(arenaProgressBarStyles({ indeterminate: false }).$data.ringFill()));
});
