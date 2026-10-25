/* No DOM and no TestBed. ArenaTabs and ArenaTab read ONE manifest -- the panel's slot lives beside the
 * tab's, because a tabpanel may not sit inside a tablist and so the two are drawn by different
 * components from the same recipe. The panel's display is the load-bearing part: it must resolve
 * to `hidden` when unselected, or every inactive panel stays on screen. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TAILWIND_COMPONENTS } from '../../../test/Compliance';
import { arenaTabsStyles } from './ArenaTabs.variants';
import { arenaTabStyles } from '../arena-tab/ArenaTab.variants';


test('the selected tab draws its rule from the role edge-tab-selected and never from the crimson alias', () => {
  const source = JSON.parse(readFileSync(join(TAILWIND_COMPONENTS, 'navigation/arena-tabs/ArenaTabs.manifest.json'), 'utf8')) as { variants: { selected: { true: { tab: string } } } };
  const tab = source.variants.selected.true.tab;
  assert.match(tab, /var\(--edge-tab-selected\)/, 'the selected rule does not read its role');
  assert.doesNotMatch(tab, /--crimson/, 'the selected rule reads an alias no style plugin can answer');
});
