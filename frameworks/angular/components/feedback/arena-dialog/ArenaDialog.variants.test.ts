import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaDialogStyles } from './ArenaDialog.variants';

function tokens(classString: string): string[] {
  return classString.split(/\s+/).filter(Boolean);
}

test('only the scrim varies with open -- the panel and its interior slots are constant', () => {
  const closed = arenaDialogStyles({ open: false });
  const open = arenaDialogStyles({ open: true });
  for (const slot of ['panel', 'head', 'eyebrow', 'title', 'body', 'foot'] as const) {
    assert.equal(JSON.stringify(closed.$data[slot]()), JSON.stringify(open.$data[slot]()), `${slot} must not vary with open`);
  }
});

