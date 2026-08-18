import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { arenaSiteFooterStyles } from './ArenaSiteFooter.variants';
import manifest from './ArenaSiteFooter.classes.generated';

const TRACKS = 'repeat(auto-fit, minmax(min(var(--grid-min), 100%), 1fr))';
const PAGE = 'var(--container-max)';

@Component({
  selector: 'arena-site-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <footer [class]="styles().root()" [attr.data-arena-part]="parts.root">
      <div [class]="styles().band()" [attr.data-arena-part]="parts.band" [style.maxWidth]="page">
        <div [class]="styles().columns()" [attr.data-arena-part]="parts.columns" [style.gridTemplateColumns]="tracks"><ng-content /></div>
        @if (note(); as line) { <p [class]="styles().note()" [attr.data-arena-part]="parts.note">{{ line }}</p> }
      </div>
    </footer>
  `,
})
export class ArenaSiteFooter {
  protected readonly parts = manifest.parts;

  /** The line under the columns, in the muted ink: the licence, the year, the company. Absent, the footer renders no line at all rather than an empty one. */
  readonly note = input<string>();

  protected readonly tracks = TRACKS;
  protected readonly page = PAGE;
  protected readonly styles = computed(() => arenaSiteFooterStyles());
}
