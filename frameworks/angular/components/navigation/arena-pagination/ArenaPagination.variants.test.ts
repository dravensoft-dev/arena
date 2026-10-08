/* No DOM and no TestBed: the current page is a group on the one page slot, so the recipe's output
 * differs per selection and nothing else in the slot set moves with it. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaPaginationStyles } from './ArenaPagination.variants';


test('the current page differs from the other pages on the page slot only', () => {
  const on = arenaPaginationStyles({ current: true });
  const off = arenaPaginationStyles({ current: false });
  assert.notEqual(JSON.stringify(on.$data.page()), JSON.stringify(off.$data.page()));
  assert.equal(JSON.stringify(on.$data.nav()), JSON.stringify(off.$data.nav()));
  assert.equal(JSON.stringify(on.$data.ellipsis()), JSON.stringify(off.$data.ellipsis()));
});
