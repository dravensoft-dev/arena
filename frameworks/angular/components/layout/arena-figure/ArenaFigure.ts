import { ChangeDetectionStrategy, Component, computed, contentChild, input } from '@angular/core';
import { ArenaFallback, ArenaMedia, ArenaOverlay } from '../../../ProjectionMarkers';
import { arenaFigureStyles } from './ArenaFigure.variants';
import manifest from './ArenaFigure.classes.generated';

@Component({
  selector: 'arena-figure',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <figure [class]="styles().root()" [attr.data-arena-part]="parts.root">
      <div [class]="styles().frame()" [attr.data-arena-part]="parts.frame" [style.aspectRatio]="ratio()">
        @if (media()) { <div [class]="styles().media()" [attr.data-arena-part]="parts.media"><ng-content select="[media]" /></div> }
        @if (!media() && fallback()) {
          <div [class]="styles().fallback()" [attr.data-arena-part]="parts.fallback"><ng-content select="[fallback]" /></div>
        }
        @if (overlay()) { <div [class]="styles().overlay()" [attr.data-arena-part]="parts.overlay"><ng-content select="[overlay]" /></div> }
      </div>
      @if (caption(); as line) { <figcaption [class]="styles().caption()" [attr.data-arena-part]="parts.caption">{{ line }}</figcaption> }
    </figure>
  `,
})
export class ArenaFigure {
  protected readonly parts = manifest.parts;

  /** A line under the frame, rendered as a real figcaption inside a real figure, so the association is the platform's rather than a class name's. Absent, the figure renders no caption element at all rather than an empty one. */
  readonly caption = input<string>();
  /** The shape of the frame, as a CSS aspect ratio. The default is the role, so a style plugin answers it for every figure at once and a shop crops portrait where a gallery tiles square. Give it a value outright for the figure whose shape is not the plugin's to decide: a video is sixteen by nine whatever the page sounds like. */
  readonly ratio = input<string, string | undefined>(
    'var(--aspect-media)', { transform: (value) => value ?? 'var(--aspect-media)' },
  );

  protected readonly media = contentChild(ArenaMedia);
  protected readonly fallback = contentChild(ArenaFallback);
  protected readonly overlay = contentChild(ArenaOverlay);

  protected readonly styles = computed(() => arenaFigureStyles());
}
