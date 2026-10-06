/* No DOM and no TestBed. The manifest carries no `variants` at all -- the current page and
 * the rest are two sibling SLOTS the component picks between -- so what is worth asserting
 * is that the pair stays disjoint from the shared `page` slot. The moment one of them
 * declares a border width or a display, the concatenation in pageClass() has two winners
 * and the sheet's order decides which, silently. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaPaginationStyles } from './ArenaPagination.variants';

