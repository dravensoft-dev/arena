import { ChangeDetectionStrategy, Component, booleanAttribute, computed, contentChild, input } from '@angular/core';
import { ArenaActions, ArenaBrand, ArenaNav } from '../../../ProjectionMarkers';
import { arenaAppBarStyles } from './ArenaAppBar.variants';
import manifest from './ArenaAppBar.classes.generated';
import { ArenaSlotAttributes } from '../../../SlotData';

const PAGE = 'var(--container-max)';

@Component({
  selector: 'arena-app-bar',
  standalone: true,
  imports: [ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <header [class]="styles().root()" [arenaSlotData]="styles().$data.root()" [attr.data-arena-part]="parts.root">
      <div [class]="styles().band()" [attr.data-arena-part]="parts.band" [style.maxWidth]="page">
        @if (brand()) { <div [class]="styles().brand()" [attr.data-arena-part]="parts.brand" data-arena-boundary><ng-content select="[brand]" /></div> }
        @if (nav()) { <div [class]="styles().nav()" [attr.data-arena-part]="parts.nav" data-arena-boundary><ng-content select="[nav]" /></div> }
        @if (actions()) { <div [class]="styles().actions()" [attr.data-arena-part]="parts.actions" data-arena-boundary><ng-content select="[actions]" /></div> }
      </div>
    </header>
  `,
})
export class ArenaAppBar {
  protected readonly parts = manifest.parts;

  /** Whether the bar stays at the top edge as the page scrolls. True by default, because a bar that carries the way through a site and scrolls away with the content is a bar the reader has to go back for. It takes the navigation layer of the stacking order, so a dialog and a sheet still cover it. */
  readonly sticky = input(true, { transform: booleanAttribute });

  protected readonly brand = contentChild(ArenaBrand);
  protected readonly nav = contentChild(ArenaNav);
  protected readonly actions = contentChild(ArenaActions);

  protected readonly page = PAGE;
  protected readonly styles = computed(() => arenaAppBarStyles({ sticky: this.sticky() }));
}
