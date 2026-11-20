import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaSelectStyles } from './ArenaSelect.variants';

function tokens(classString: string): string[] {
  return classString.split(/\s+/).filter(Boolean);
}

test('disabled reaches each part that fades on its own, and the wrap fades the select with its caret and glyph', () => {
  const enabled = arenaSelectStyles({ disabled: false });
  const off = arenaSelectStyles({ disabled: true });
  assert.equal(JSON.stringify(enabled.$data.field()), JSON.stringify(off.$data.field()), 'the native field reads :disabled');
  assert.equal(off.$data.wrap()['data-arena-disabled'], '', 'the wrap carries the fade');
  for (const slot of ['label', 'hint', 'error'] as const) {
    assert.equal(off.$data[slot]()['data-arena-disabled'], '', `${slot} fades on its own`);
  }
  assert.equal(JSON.stringify(off.$data.root()), JSON.stringify({}), 'the root carries no fade');
});

