import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { arenaAppLogoStyles } from './ArenaAppLogo.variants';
import manifest from './ArenaAppLogo.classes.generated';
import { ArenaSlotAttributes } from '../../../SlotData';

@Component({
  selector: 'arena-app-logo',
  standalone: true,
  imports: [ArenaSlotAttributes],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'styles().root()',
    '[attr.data-arena-part]': 'parts.root',
    '[attr.name]': 'null',
  },
  template: `
    <span [class]="styles().mark()" [arenaSlotData]="styles().$data.mark()" [attr.data-arena-part]="parts.mark" data-arena-boundary><ng-content select="[mark]" /></span>
    <span [class]="styles().name()" [arenaSlotData]="styles().$data.name()" [attr.data-arena-part]="parts.name">{{ name() }}@if (dim(); as tail) {<span [class]="styles().dim()" [attr.data-arena-part]="parts.dim">{{ tail }}</span>}</span>
  `,
})
export class ArenaAppLogo {
  protected readonly parts = manifest.parts;

  /** The product name, or its first half when `dim` carries the second. */
  readonly name = input.required<string>();
  /** The wordmark's second half, drawn muted and set straight against `name` with no space between them, so `name` of Draven and `dim` of soft reads as the one word Dravensoft. It is the second half of a name and never a tagline beside it: a product called Coldwalk splits as Cold and walk, and passing the tagline here draws it butted onto the name. Present for the manual's Primary variant, absent for Monochrome, which is why there is no `variant` member: the mark's ink and this are the same two decisions. */
  readonly dim = input<string>();

  protected readonly styles = computed(() => arenaAppLogoStyles({}));
}
