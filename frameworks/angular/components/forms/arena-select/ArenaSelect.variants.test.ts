import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaSelectStyles } from './ArenaSelect.variants';

function tokens(classString: string): string[] {
  return classString.split(/\s+/).filter(Boolean);
}

test('only the root varies with disabled -- the field, label, wrap and caret are constant', () => {
  const enabled = arenaSelectStyles({ disabled: false });
  const off = arenaSelectStyles({ disabled: true });
  for (const slot of ['label', 'wrap', 'field', 'caret'] as const) {
    assert.equal(JSON.stringify(enabled.$data[slot]()), JSON.stringify(off.$data[slot]()), `${slot} must not vary with disabled`);
  }
});

