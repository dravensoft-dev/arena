import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { isArenaPrimaryActivation } from '../../../AnchorActivation';
import type { ArenaCrumb } from '../../../Api.generated';
import { arenaBreadcrumbsStyles } from './ArenaBreadcrumbs.variants';

@Component({
  selector: 'arena-breadcrumbs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <nav [class]="styles().root()" [attr.aria-label]="label()">
      @for (crumb of items(); track crumb.label; let last = $last) {
        @if (last) {
          <span [class]="styles().current()" aria-current="page">{{ crumb.label }}</span>
        } @else {
          <a [class]="styles().crumb()" [attr.href]="crumb.href ?? '#'" (click)="onCrumbClick(crumb, $event)">{{ crumb.label }}</a>
          <span [class]="styles().separator()" aria-hidden="true">{{ separator() }}</span>
        }
      }
    </nav>
  `,
})
export class ArenaBreadcrumbs {
  /** Names this navigation landmark. Required, and guarded at runtime: nothing can derive it, and the constant "Breadcrumb" it used to hardcode made two trails on one page indistinguishable as landmarks while satisfying the requirement mechanically. Say which hierarchy this is a trail through: "Project navigation", never "Breadcrumb". */
  readonly ariaLabel = input.required<string>();
  /** The trail, root first. The last entry is the current location and is never a link. */
  readonly items = input.required<readonly ArenaCrumb[]>();
  /** Drawn between crumbs, never before the first. Arena draws it, in its own aria-hidden span. */
  readonly separator = input<string, string | undefined>('/', { transform: (value) => value ?? '/' });
  /** A non-current crumb was activated, carrying that crumb alone. The native MouseEvent is not forwarded, because a platform's own event type never travels in a payload; what the listener needs from it, the chance to route instead of navigating, arrives as behaviour rather than as data. Arena has already cancelled the anchor by the time this fires, so a listener routes and does not double-navigate. It fires for a primary click with no modifier and for Enter; ctrl-click, middle-click and open-in-new-tab are the browser's and fire nothing, so a consumer who wires no listener still has a working trail of real links. */
  readonly navigate = output<ArenaCrumb>();

  protected readonly label = computed(() => {
    const name = this.ariaLabel();
    if (name.trim() === '') {
      throw new Error('ArenaBreadcrumbs: `ariaLabel` is required, and names which hierarchy this trail runs through');
    }
    return name;
  });

  protected readonly styles = computed(() => arenaBreadcrumbsStyles());

  protected onCrumbClick(crumb: ArenaCrumb, event: MouseEvent): void {
    if (!isArenaPrimaryActivation(event)) return;
    event.preventDefault();
    this.navigate.emit(crumb);
  }
}
