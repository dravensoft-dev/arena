import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaSheetStyles } from './ArenaSheet.variants';

const PLACEMENTS = ['bottom', 'start', 'end'] as const;

function tokens(classString: string): string[] {
  return classString.split(/\s+/).filter(Boolean);
}

test('only the root varies with placement -- the head, controls, body and foot are constant', () => {
  const bottom = arenaSheetStyles({ placement: 'bottom', open: true });
  const end = arenaSheetStyles({ placement: 'end', open: true });
  for (const slot of ['head', 'trigger', 'caret', 'close', 'body', 'foot'] as const) {
    assert.equal(JSON.stringify(bottom.$data[slot]()), JSON.stringify(end.$data[slot]()), `${slot} must not vary with placement`);
  }
});
