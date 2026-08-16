import { Injectable, inject } from '@angular/core';
import { PRIMARY_OUTLET, TitleStrategy } from '@angular/router';
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { ArenaMetadataService } from './ArenaMetadataService';
import { ARENA_ROUTE_KEY } from './ArenaRouteMetadata';
import type { ArenaRouteMetadata } from './ArenaRouteMetadata';

export function arenaRouteMetadataOf(root: ActivatedRouteSnapshot): ArenaRouteMetadata {
  let route: ActivatedRouteSnapshot | undefined = root;
  let merged: ArenaRouteMetadata = {};
  while (route !== undefined) {
    const own = route.data[ARENA_ROUTE_KEY] as ArenaRouteMetadata | undefined;
    if (own !== undefined) merged = { ...merged, ...own };
    route = route.children.find((child) => child.outlet === PRIMARY_OUTLET);
  }
  return merged;
}

@Injectable()
export class ArenaTitleStrategy extends TitleStrategy {
  private readonly metadata = inject(ArenaMetadataService);

  updateTitle(snapshot: RouterStateSnapshot): void {
    this.metadata.apply({
      ...arenaRouteMetadataOf(snapshot.root),
      title: this.buildTitle(snapshot),
      url: snapshot.url,
    });
  }
}
