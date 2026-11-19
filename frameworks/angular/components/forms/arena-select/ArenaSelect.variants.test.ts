import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaSelectStyles } from './ArenaSelect.variants';

function tokens(classString: string): string[] {
  return classString.split(/\s+/).filter(Boolean);
}

test('disabled reaches each part that fades on its own, and the wrap and the native field read :disabled', () => {
  const enabled = arenaSelectStyles({ disabled: false });
  const off = arenaSelectStyles({ disabled: true });
  for (const slot of ['wrap', 'field'] as const) {
    assert.equal(JSON.stringify(enabled.$data[slot]()), JSON.stringify(off.$data[slot]()), `${slot} must not vary with disabled`);
  }
  for (const slot of ['label', 'hint', 'error', 'caret', 'iconWrap'] as const) {
    assert.equal(off.$data[slot]()['data-arena-disabled'], '', `${slot} fades on its own`);
  }
  assert.equal(JSON.stringify(off.$data.root()), JSON.stringify({}), 'the root carries no fade');
});

