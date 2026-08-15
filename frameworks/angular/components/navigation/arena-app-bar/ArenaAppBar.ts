import { ChangeDetectionStrategy, Component, booleanAttribute, computed, contentChild, input } from '@angular/core';
import { ArenaActions, ArenaBrand, ArenaNav } from '../../../ProjectionMarkers';
import { arenaAppBarStyles } from './ArenaAppBar.variants';

const PAGE = 'var(--container-max)';

@Component({
  selector: 'arena-app-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <header [class]="styles().root()">
      <div [class]="styles().band()" [style.maxWidth]="page">
        @if (brand()) { <div [class]="styles().brand()"><ng-content select="[brand]" /></div> }
        @if (nav()) { <div [class]="styles().nav()"><ng-content select="[nav]" /></div> }
        @if (actions()) { <div [class]="styles().actions()"><ng-content select="[actions]" /></div> }
      </div>
    </header>
  `,
})
export class ArenaAppBar {
  /** Whether the bar stays at the top edge as the page scrolls. True by default, because a bar that carries the way through a site and scrolls away with the content is a bar the reader has to go back for. It takes the navigation layer of the stacking order, so a dialog and a sheet still cover it. */
  readonly sticky = input(true, { transform: booleanAttribute });

  protected readonly brand = contentChild(ArenaBrand);
  protected readonly nav = contentChild(ArenaNav);
  protected readonly actions = contentChild(ArenaActions);

  protected readonly page = PAGE;
  protected readonly styles = computed(() => arenaAppBarStyles({ sticky: this.sticky() }));
}
