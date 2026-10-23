/* No DOM and no TestBed: the recipe alone. destructive is the only variant, and it marks both halves
 * so each draws the danger outline. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaSplitButtonStyles } from './ArenaSplitButton.variants';

test('the default is a split that destroys nothing', () => {
  assert.equal(
    JSON.stringify(arenaSplitButtonStyles().$data.caret()),
    JSON.stringify(arenaSplitButtonStyles({ destructive: false }).$data.caret()),
  );
  assert.equal(arenaSplitButtonStyles().$data.primary()['data-arena-destructive'], undefined);
});

test('destructive reaches both halves and neither the root nor the spinner', () => {
  const styles = arenaSplitButtonStyles({ destructive: true });
  assert.equal(styles.$data.primary()['data-arena-destructive'], '');
  assert.equal(styles.$data.caret()['data-arena-destructive'], '');
  assert.equal(styles.$data.root()['data-arena-destructive'], undefined);
  assert.equal(styles.$data.spinner()['data-arena-destructive'], undefined);
});
