import { InjectionToken, type Provider } from '@angular/core';

export const ARENA_ICONS = new InjectionToken<string | null>('ARENA_ICONS', { factory: () => null });

export function provideArenaIcons(href: string): Provider {
  return { provide: ARENA_ICONS, useValue: href };
}
