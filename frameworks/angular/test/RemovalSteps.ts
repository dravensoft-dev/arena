/* The one dispatcher of the palette-removal table's steps for this layer, shared by the service suite
 * and the scope suite. The Angular test build compiles from this layer's root, so it cannot import the
 * table (scripts/lib/arena/palette-removal-cases.ts); the step shapes are restated here once, and
 * scripts/lib/arena/palette-removal-cases.test.ts reads this file to hold the kinds it handles to the
 * kinds the table uses. */
import assert from 'node:assert/strict';
import type { ArenaRuntimePalette, ArenaThemeService } from '../theme/ArenaThemeService';

export type Polarity = 'dark' | 'light';
export type RemovalStep =
  | { do: 'register'; name: string; polarity: Polarity }
  | { do: 'set'; name: string }
  | { do: 'toggle' }
  | { do: 'remove'; name: string; returns: boolean }
  | { do: 'remove'; name: string; throws: string };

export function removalStep(
  theme: ArenaThemeService, step: RemovalStep, palette: (name: string, polarity: Polarity) => ArenaRuntimePalette,
): void {
  if (step.do === 'register') theme.register(palette(step.name, step.polarity));
  else if (step.do === 'set') theme.set(step.name);
  else if (step.do === 'toggle') theme.toggle();
  else if (step.do === 'remove') {
    if ('throws' in step) assert.throws(() => theme.unregister(step.name), new Error(`ArenaThemeService.unregister: ${step.throws}`));
    else assert.equal(theme.unregister(step.name), step.returns);
  } else throw new Error(`a removal case has no ${(step as { do: string }).do} step`);
}

export function stubPrefers(light: boolean): () => void {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({ matches: light && query.includes('light'), media: query })) as unknown as typeof window.matchMedia;
  return () => { window.matchMedia = original; };
}
