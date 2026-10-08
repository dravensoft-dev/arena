/* No DOM and no TestBed: these are assertions about the recipe alone. The tone tests exist
 * because a size utility and a variant's own padding are both emitted, so the sheet's order
 * decides which one shows. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaButtonStyles } from './ArenaButton.variants';

