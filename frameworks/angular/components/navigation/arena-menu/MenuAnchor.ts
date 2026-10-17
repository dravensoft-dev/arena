import { InjectionToken } from '@angular/core';

export const ARENA_MENU_ANCHOR = new InjectionToken<() => HTMLElement | null>('ARENA_MENU_ANCHOR');
