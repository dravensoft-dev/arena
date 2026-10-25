/* The one dispatcher of the palette-removal table's steps for this layer: the theme suite runs it
 * directly and the scope suite runs it inside `act`. The types come from the table's values, so the
 * runtime import is what check:script-reach sees. */

import assert from 'node:assert/strict';
import { REMOVAL_CASES, removalPalette } from '../../../scripts/lib/arena/palette-removal-cases.ts';
import { registerArenaPalette, setArenaTheme, toggleArenaTheme, unregisterArenaPalette } from '../Theme.ts';

export type RemovalStep = (typeof REMOVAL_CASES)[number]['steps'][number];
export type RemovalObserved = (typeof REMOVAL_CASES)[number]['expect'];

export function removalStep(step: RemovalStep, wrap: (run: () => void) => void = (run) => run()): void {
  if (step.do === 'register') wrap(() => registerArenaPalette(removalPalette(step.name, step.polarity)));
  else if (step.do === 'set') wrap(() => { setArenaTheme(step.name); });
  else if (step.do === 'toggle') wrap(() => { toggleArenaTheme(); });
  else if (step.do === 'remove') {
    if ('throws' in step) {
      wrap(() => assert.throws(() => unregisterArenaPalette(step.name), new Error(`unregisterArenaPalette: ${step.throws}`)));
    } else wrap(() => assert.equal(unregisterArenaPalette(step.name), step.returns));
  } else throw new Error(`a removal case has no ${(step as { do: string }).do} step`);
}

export function stubPrefers(light: boolean): () => void {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({ matches: light && query.includes('light'), media: query })) as unknown as typeof window.matchMedia;
  return () => { window.matchMedia = original; };
}

export function withPrefers<T>(light: boolean, run: () => T): T {
  const restore = stubPrefers(light);
  try {
    return run();
  } finally {
    restore();
  }
}
