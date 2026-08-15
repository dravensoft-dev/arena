import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { arenaSiteFooterStyles } from './ArenaSiteFooter.variants';

const TRACKS = 'repeat(auto-fit, minmax(min(var(--grid-min), 100%), 1fr))';
const PAGE = 'var(--container-max)';

@Component({
  selector: 'arena-site-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <footer [class]="styles().root()">
      <div [class]="styles().band()" [style.maxWidth]="page">
        <div [class]="styles().columns()" [style.gridTemplateColumns]="tracks"><ng-content /></div>
        @if (note(); as line) { <p [class]="styles().note()">{{ line }}</p> }
      </div>
    </footer>
  `,
})
export class ArenaSiteFooter {
  /** The line under the columns, in the muted ink: the licence, the year, the company. Absent, the footer renders no line at all rather than an empty one. */
  readonly note = input<string>();

  protected readonly tracks = TRACKS;
  protected readonly page = PAGE;
  protected readonly styles = computed(() => arenaSiteFooterStyles());
}
