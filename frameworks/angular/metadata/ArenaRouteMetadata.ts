import type { Data } from '@angular/router';

export interface ArenaRouteMetadata {
  description?: string;
  robots?: string;
  image?: string;
  type?: string;
  canonical?: string;
}

export const ARENA_ROUTE_KEY = 'arena';

export function arenaRouteMeta(meta: ArenaRouteMetadata): Data {
  return { [ARENA_ROUTE_KEY]: meta };
}
