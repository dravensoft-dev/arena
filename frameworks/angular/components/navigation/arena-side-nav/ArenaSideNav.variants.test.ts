import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaSideNavStyles } from './ArenaSideNav.variants';
import { arenaIndentDepth } from './ArenaSideNavState';

function tokens(classString: string): string[] {
  return classString.split(/\s+/).filter(Boolean);
}

test('only the item varies with active -- the section, its heading, the trigger and the region are constant', () => {
  const on = arenaSideNavStyles({ active: true });
  const off = arenaSideNavStyles({ active: false });
  for (const slot of ['root', 'icon', 'section', 'sectionLabel', 'trigger', 'triggerLabel', 'caret', 'region'] as const) {
    assert.equal(on[slot](), off[slot](), `${slot} must not vary with active`);
  }
});

test('the indent depth is a number the component binds, never a length held by a static utility', () => {
  assert.equal(typeof arenaIndentDepth(3, 2), 'number',
    'a static utility cannot hold a runtime multiplier, so the depth travels as a unitless channel');
});
