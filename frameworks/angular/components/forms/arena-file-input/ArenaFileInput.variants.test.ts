/* No DOM and no TestBed: the recipe alone. droppable and disabled are members, dragging and state
 * are the component's own, and this pins which slot each group reaches; the component's suites pin
 * which arm it picks. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaFileInputStyles } from './ArenaFileInput.variants';

const data = (chosen: Parameters<typeof arenaFileInputStyles>[0], slot: 'root' | 'zone' | 'trigger') =>
  JSON.stringify(arenaFileInputStyles(chosen).$data[slot]());

test('the default is a neutral, enabled field that takes no drop', () => {
  assert.equal(data({}, 'zone'), data({ droppable: false, dragging: false, state: 'neutral', disabled: false }, 'zone'));
});

test('droppable, dragging and state each reach the zone', () => {
  assert.notEqual(data({ droppable: true }, 'zone'), data({ droppable: false }, 'zone'));
  assert.notEqual(data({ dragging: true }, 'zone'), data({ dragging: false }, 'zone'));
  assert.notEqual(data({ state: 'error' }, 'zone'), data({ state: 'neutral' }, 'zone'));
});

test('disabled reaches the root and the trigger, and nothing else', () => {
  assert.notEqual(data({ disabled: true }, 'root'), data({ disabled: false }, 'root'));
  assert.notEqual(data({ disabled: true }, 'trigger'), data({ disabled: false }, 'trigger'));
  assert.equal(data({ disabled: true }, 'zone'), data({ disabled: false }, 'zone'));
});
