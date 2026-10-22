/* A runtime palette in the shape `arenaRuntimePalette` returns (scripts/generate/core/arena-cli/palette.ts).
 * The Angular test build compiles from this layer's root, so it cannot import that module; typing the
 * fixture as ArenaRuntimePalette keeps its fields in step with the service, and scripts/generate/core/arena-cli/palette-shape.test.ts
 * is what guards the shape of the two declarations against drifting apart. */
import type { ArenaRuntimePalette } from '../theme/ArenaThemeService';

export function runtimePalette(name: string, polarity: 'dark' | 'light', base = '#1b1830'): ArenaRuntimePalette {
  return {
    name,
    polarity,
    properties: {
      '--color-base-100': base,
      '--color-base-200': '#25213f',
      '--color-base-content': '#f3ede5',
      '--level-2': '8%',
      '--arena-palette': name,
    },
  };
}

export const RUNTIME_MARKER = '--arena-runtime-palettes';

export function markRuntimePalettes(): () => void {
  document.documentElement.style.setProperty(RUNTIME_MARKER, '1');
  return () => document.documentElement.style.removeProperty(RUNTIME_MARKER);
}
