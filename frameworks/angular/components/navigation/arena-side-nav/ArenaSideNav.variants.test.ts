import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaSideNavStyles } from './ArenaSideNav.variants';
import { arenaIndentDepth } from './ArenaSideNavState';

function tokens(classString: string): string[] {
  return classString.split(/\s+/).filter(Boolean);
}

test('only the item varies with current -- the section, its heading, the trigger and the region are constant', () => {
  const on = arenaSideNavStyles({ current: true });
  const off = arenaSideNavStyles({ current: false });
  for (const slot of ['root', 'icon', 'section', 'sectionLabel', 'trigger', 'triggerLabel', 'caret', 'region'] as const) {
    assert.equal(JSON.stringify(on.$data[slot]()), JSON.stringify(off.$data[slot]()), `${slot} must not vary with current`);
  }
});

test('the indent depth is a number the component binds, never a length held by a static utility', () => {
  assert.equal(typeof arenaIndentDepth(2), 'number',
    'a static utility cannot hold a runtime multiplier, so the depth travels as a unitless channel');
});
