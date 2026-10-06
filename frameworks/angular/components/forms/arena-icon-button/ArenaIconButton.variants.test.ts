/* No DOM and no TestBed: assertions about the recipe alone. The showLabel axis is where this
 * recipe differs from ArenaButton's -- the manifest's variant keys are the strings "true"/"false"
 * while its defaultVariants are real booleans, so the recipe is what reconciles the two. */

import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaIconButtonStyles } from './ArenaIconButton.variants';

test('the default is a ghost md control with no visible label', () => {
  assert.equal(
    JSON.stringify(arenaIconButtonStyles().$data.root()),
    JSON.stringify(arenaIconButtonStyles({ variant: 'ghost', size: 'md', showLabel: false }).$data.root()),
  );
});

