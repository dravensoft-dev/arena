import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, input, output,
} from '@angular/core';
import { isArenaPrimaryActivation } from '../../../AnchorActivation';
import { arenaBreadcrumbList } from '../../../StructuredData';
import type { ArenaCrumb } from '../../../Api.generated';
import { arenaBreadcrumbsStyles } from './ArenaBreadcrumbs.variants';
import manifest from './ArenaBreadcrumbs.classes.generated';

@Component({
  selector: 'arena-breadcrumbs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <nav [class]="styles().root()" [attr.data-arena-part]="parts.root" [attr.aria-label]="label()">
      @for (crumb of items(); track crumb.label; let last = $last) {
        @if (last) {
          <span [class]="styles().current()" [attr.data-arena-part]="parts.current" aria-current="page">{{ crumb.label }}</span>
        } @else {
          @if (crumb.href; as destination) {
            <a [class]="linked().crumb()" [attr.data-arena-part]="parts.crumb" [attr.href]="destination" (click)="onCrumbClick(crumb, $event)">{{ crumb.label }}</a>
          } @else {
            <span [class]="unlinked().crumb()" [attr.data-arena-part]="parts.crumb">{{ crumb.label }}</span>
          }
          <span [class]="styles().separator()" [attr.data-arena-part]="parts.separator" aria-hidden="true">{{ separator() }}</span>
        }
      }
    </nav>
  `,
})
export class ArenaBreadcrumbs {
  protected readonly parts = manifest.parts;

  /** Names this navigation landmark. Required, and guarded at runtime: nothing can derive it, and the constant "Breadcrumb" it used to hardcode made two trails on one page indistinguishable as landmarks while satisfying the requirement mechanically. Say which hierarchy this is a trail through: "Project navigation", never "Breadcrumb". */
  readonly ariaLabel = input.required<string>();
  /** The trail, root first. The last entry is the current location and is never a link. */
  readonly items = input.required<readonly ArenaCrumb[]>();
  /** Drawn between crumbs, never before the first. Arena draws it, in its own aria-hidden span. */
  readonly separator = input<string, string | undefined>('/', { transform: (value) => value ?? '/' });
  /** The scheme and host each crumb's href is resolved against in the structured data the component emits, as in "https://example.com". Absent, the relative href is published as it stands, which is valid and less well supported. It is a member rather than something read off the document because location.origin does not exist on a server, and a value that differs between the server render and the client one is the hydration hazard ArenaCalendar.timeZone already documents; a value the consumer passes cannot differ. One line per application, not per screen. It changes nothing a person sees. */
  readonly origin = input<string>();
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

  protected readonly linked = computed(() => arenaBreadcrumbsStyles({ linked: true }));

  protected readonly unlinked = computed(() => arenaBreadcrumbsStyles({ linked: false }));

  private readonly doc = inject(DOCUMENT);
  private readonly host = inject(ElementRef<HTMLElement>);

  private readonly script = (() => {
    const node = this.doc.createElement('script');
    node.type = 'application/ld+json';
    return node;
  })();

  constructor() {
    (this.host.nativeElement as HTMLElement).appendChild(this.script);
    effect(() => {
      this.script.textContent = arenaBreadcrumbList(this.items(), this.origin());
    });
  }

  protected onCrumbClick(crumb: ArenaCrumb, event: MouseEvent): void {
    if (!isArenaPrimaryActivation(event)) return;
    event.preventDefault();
    this.navigate.emit(crumb);
  }
}
