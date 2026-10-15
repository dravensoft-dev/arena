/* The bubble is placed by the overlay, so its stylesheet carries the bubble's appearance and
 * nothing that positions it: a wrapper-relative rule left in the sheet would pull the bubble out
 * of the pane that places it. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO } from '../../../test/Compliance';
import { arenaTooltipStyles } from './ArenaTooltip.variants';

test('the sheet positions neither the bubble nor the root, and no variant group touches them', () => {
  const css = readFileSync(join(REPO, 'frameworks/tailwind/consume/components/feedback/arena-tooltip/ArenaTooltip.styles.generated.css'), 'utf8');
  assert.doesNotMatch(css, /data-arena-anchored/);
  assert.doesNotMatch(css, /\.arena-tooltip__(?:bubble|root)[^{]*\{[^}]*(?:^|[\s;])(?:position|left|right|top|bottom|inset|margin-top|transform|translate):/m);
  assert.deepEqual(arenaTooltipStyles().$data.bubble(), {});
  assert.deepEqual(arenaTooltipStyles().$data.root(), {});
});
