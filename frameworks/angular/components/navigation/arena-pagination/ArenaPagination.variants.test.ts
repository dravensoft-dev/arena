/* No DOM and no TestBed: the current page is a group on the one page slot, so the recipe's output
 * differs per selection and nothing else in the slot set moves with it. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaPaginationStyles } from './ArenaPagination.variants';


test('the current page differs from the other pages on the page slot only', () => {
  const on = arenaPaginationStyles({ current: true });
  const off = arenaPaginationStyles({ current: false });
  assert.notEqual(on.page(), off.page());
  assert.equal(on.nav(), off.nav());
  assert.equal(on.ellipsis(), off.ellipsis());
});
